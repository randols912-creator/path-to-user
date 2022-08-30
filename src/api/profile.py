import sys, os
import datetime
from sanic.log import logger
from api.geni import GeniClientAsync
from api.models import CURRENT_TIMESTAMP, paths_table, profiles_table
from sqlalchemy import and_, func
from databases import Database

from redis import StrictRedis, from_url

redis_url = os.environ.get("REDIS_URL")
if redis_url:
    redis_instance = from_url(redis_url, decode_responses=True)
else:
    redis_instance = StrictRedis(decode_responses=True)

class ProfileManager:
    TOKEN_TO_PROFILE = dict()

    def __init__(self, database: Database, geni: GeniClientAsync, token: str):
        self.geni = geni
        self.database = database
        self.token = token

    async def get(self, profile_id):
        query = profiles_table.select().where(profiles_table.c.id == profile_id)
        profile = await self.database.fetch_one(query=query)
        return profile

    async def save(self, profile_dict, is_user):
        profile = {k:v for k,v in profile_dict.items() if k in ["id", "name", "url"]}
        profile["is_user"] = is_user
        profile["details"] = {
            k:v
            for k,v in profile_dict.items() 
            if k not in ["api_errors", "internal_errors", "is_success"]
        }
        logger.debug("save: ", profile)
        profile_db = await self.get(profile['id'])
        # Insert or update
        if not profile_db:
            query = profiles_table.insert().values(profile)
        else:
            query = profiles_table.update().where(profiles_table.c.id == profile['id']).values(profile)

        await self.database.execute(query)

    async def cache(self, profile_id=None):
        # Check if token is still in cache
        if not profile_id and self.token in self.TOKEN_TO_PROFILE:
            profile,cached_at =  self.TOKEN_TO_PROFILE[self.token]
            update_active = datetime.datetime.now() - cached_at > datetime.timedelta(minutes=5)
        else:
            profile, self.token = await self.geni.get_profile_details(self.token, profile_id)
            # Cache mapped to token only if the profile is of a current user
            if not profile_id:
                self.TOKEN_TO_PROFILE[self.token] = profile,datetime.datetime.now()
            update_active = True
        # Update last active field (if needed)
        if update_active:
            update = {"last_active_on": datetime.datetime.now()}
            query = profiles_table.update().where(profiles_table.c.id == profile['id']).values(update)
            await self.database.execute(query)

        return profile

    async def count(self, target_id):
        #query = profiles_table.count().where(profiles_table.c.is_user == is_user)
        #count = await self.database.fetch_one(query=query)
        if not target_id:
            return 0
        if target_id.startswith('profile'):
            return 1

        total_count = redis_instance.get(target_id)
        if total_count:
            return total_count

        if  target_id.startswith('project'):
            p,np,total_count = await self.geni.get_personalities_profiles(self.token, project_id=target_id)

        redis_instance.setex(target_id,
                    60*60,
                    total_count) # ttl
        return total_count

    async def load_personalities(self):
        personalities = []
        async for personality in self.iterate_personalities():
            personalities.append(personality)
        return personalities

    async def iterate_personalities(self):
        query = profiles_table.select().where(profiles_table.c.is_user == False)
        async for row in self.database.iterate(query=query):
            yield row

    # Cache personalities based on Geni project
    async def cache_personalities_geni(self, project_id, iterate=False):
        profiles, next_page_url, total_count = await self.geni.get_personalities_profiles(self.token, project_id=project_id)

        while profiles:
            print(f"Caching {len(profiles)} profiles")
            for profile in profiles:
                values = {'id': profile['id'],
                          'name': profile['name'],
                          'url': profile.get('url'),
                          'details': profile,
                          'is_user': False}

                profile_db = await self.get(profile['id'])
                # Insert or update
                if not profile_db:
                    query = profiles_table.insert().values(values)
                else:
                    query = profiles_table.update().where(profiles_table.c.id == profile['id']).values(values)

                await self.database.execute(query)

                if iterate:
                    yield values, total_count
            # Get next page
            if not next_page_url:
                break
            profiles, next_page_url, total_count = await self.geni.get_personalities_profiles(self.token, next_page_url)
        print("Finished getting profiles")
        
async def cache_personalities():
    from dotenv import load_dotenv
    geni = GeniClientAsync()
    authorize_url = geni.build_auth_url()
    print(f"""Caching BH personalities from Geni. Please goto: 

{authorize_url}

and paste here the token you will see in the redirected URL """)
    token = input("> ")
    print("Input project id (for example, project-10373 or project-5272")
    project_id = input("> ")
    # Load parameters
    load_dotenv()
    # Initialize database
    db_url = os.getenv("SQLALCHEMY_DATABASE_URI")
    async with Database(db_url) as database:
        pm = ProfileManager(database, geni, token)
        await pm.cache_personalities_geni(project_id)
        #await profile_report(pm, geni, token)

async def profile_report(pm, geni, token):
    batch = []
    async for profile in pm.iterate_personalities():
        #print(profile['details'].keys())
        batch.append(profile)
        if len(batch) >= 50:
            await profile_report_batch(geni, token, batch)
            batch = []

    if batch:
        await profile_report_batch(geni, token, batch)

async def profile_report_batch(geni, token, batch):
    ids_str = ",".join([p['id'] for p in batch])
    batch_details = await geni.get_profile_details(token=token, profile_id=ids_str, fields=['profile_url', 'about_me', 'detail_strings'])
    for p, d in zip(batch, batch_details[0]['results']):
        ds = d.get('detail_strings')
        if not ds or not ds.get('he') or not ds.get('he').get('about_me'):
            print(f"Missing Hebrew bio: {p['id']}, {d['profile_url']}")
        if not d.get('about_me'):
            print(f"Missing English bio: {p['id']}, {d['profile_url']}")



if __name__ == "__main__":
    import asyncio

    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(cache_personalities())

    # TODO (python 3.7)
    #    asyncio.run(cache_personalities())
