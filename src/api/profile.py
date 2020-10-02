import sys, os
from sanic.log import logger
from api.geni import GeniClientAsync
from api.models import CURRENT_TIMESTAMP, paths_table, profiles_table
from sqlalchemy import and_
from databases import Database
from api.bh import BHData

class ProfileManager:
    TOKEN_TO_PROFILE = dict()

    def __init__(self, database: Database, geni: GeniClientAsync, token: str):
        self.geni = geni
        self.database = database
        self.token = token
        self.bh_data = BHData()

    async def get(self, profile_id):
        query = profiles_table.select().where(profiles_table.c.id == profile_id)
        profile = await self.database.fetch_one(query=query)
        return profile

    async def save(self, profile_dict, is_user):
        profile = {k:v for k,v in profile_dict.items() if k in ["id", "name", "url"]}
        profile["is_user"] = is_user
        logger.debug("save: ", profile)
        profile_db = await self.get(profile['id'])
        # Insert or update
        if not profile_db:
            query = profiles_table.insert().values(profile)
        else:
            query = profiles_table.update().where(profiles_table.c.id == profile['id']).values(profile)

        await self.database.execute(query)

    async def cache(self, profile_id=None):
        # TODO: check if token has expired
        if self.token in self.TOKEN_TO_PROFILE: return self.TOKEN_TO_PROFILE[self.token]
        profile, self.token = await self.geni.get_profile_details(self.token)
        self.TOKEN_TO_PROFILE[self.token] = profile

        return profile

    async def count(self, is_user):
        query = profiles_table.count().where(profiles_table.c.is_user == is_user)
        count = await self.database.fetch_one(query=query)
        return count

    async def iterate_personalities(self):
        query = profiles_table.select().where(profiles_table.c.is_user == False)
        # TODO: iterate instead of fetching all values
        #profiles = await self.database.fetch_all(query=query)
        #return profiles
        async for row in self.database.iterate(query=query):
            yield row

    async def cache_personalities(self):
        profiles, next_page_url = await self.geni.get_personalities_profiles(self.token)

        while profiles:
            for profile in profiles:
                values = {'id': profile['id'],
                          'name': profile['name'],
                          'url': profile['url'],
                          'details': profile,
                          'is_user': False}
                # Add BH data fields                
                bh_profile = self.bh_data.get_bh_profile(profile['id'])
                if bh_profile:
                    values.update({key: bh_profile[key] for key in ['bh_theme', 'bh_floor', 'bh_location'] if bh_profile[key]})

                profile_db = await self.get(profile['id'])
                # Insert or update
                if not profile_db:
                    query = profiles_table.insert().values(values)
                else:
                    query = profiles_table.update().where(profiles_table.c.id == profile['id']).values(values)

                await self.database.execute(query)
            # Get next page
            if not next_page_url: break
            profiles, next_page_url = await self.geni.get_personalities_profiles(self.token, next_page_url)

async def cache_personalities():
    from dotenv import load_dotenv
    geni = GeniClientAsync()
    authorize_url = geni.build_auth_url()
    logger.info(f"""Caching BH personalities from Geni. Please goto: 

{authorize_url}

and paste here the token you will see in the redirected URL """)
    token = input("> ")

    # Load parameters
    load_dotenv()
    # Initialize database
    db_url = os.getenv("SQLALCHEMY_DATABASE_URI")
    async with Database(db_url) as database:
        await ProfileManager(database, geni, token).cache_personalities()


if __name__ == "__main__":
    import asyncio

    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(cache_personalities())

    # TODO (python 3.7)
    #    asyncio.run(cache_personalities())
