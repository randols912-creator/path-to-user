import logging
import csv
import re
import os
import json
from collections import OrderedDict
DEFAULT_PERSONALITIES_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "personalities.csv")
DEFAULT_LOCATIONS_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "locations.csv")

class BHData:
    THEME_MAP = {
        "Architecture": 'architecture' ,
        "Cinema & Television": 'cinema',
        "Classical Music": 'classical_music',
        "Diplomacy": 'diplomacy',
        "Economics": 'economics',
        "Humanities & Religion": 'humanities',
        "Humor": "humor",
        "Law": 'law',
        "Literature & Poetry": 'literature',
        "Military": 'military',
        "Other": 'other',
        "Visual Art": "visual_art",
        "Plastic Art": 'plastic_art',
        "Popular Music":'popular_music',
        "Press & Media": 'press',
        "Science": 'science',
        "Sports": 'sports',
        "Theatre": 'theater',
        "The Holocaust": 'holocaust'
    }

    DATA = dict()

    def __init__(self, personalities_csv=DEFAULT_PERSONALITIES_CSV):
        if not BHData.DATA:
          with open(personalities_csv, "r") as f:
            logging.info("Loading BH data")
            csv_f = csv.reader(f)
            headers = next(csv_f)
            self.headers = [re.sub("\s+", "_", h).lower() for h in headers]
            for row in csv_f:
                row_dict = OrderedDict(zip(self.headers, row))
                row_dict['bh_theme'] = row_dict['bh_theme'].strip() # self.THEME_MAP.get(row_dict['bh_theme'].strip(), "other")
                BHData.DATA[row_dict['geni_id']] = row_dict
                try:
                    row_dict['bh_location'] = json.loads(row_dict['bh_location'])
                except:
                    pass

    def __iter__(self):
        return iter(BHData.DATA)

    def get_bh_profile(self, geni_id):
        return BHData.DATA.get(geni_id, dict())

    async def guid_to_profiles(self, geni_token, locations_csv, personalities_csv_out):
        from api.geni import GeniClientAsync

        locations = dict()
        with open(locations_csv, "r") as lf:
            csv_f = csv.reader(lf)
            headers = next(csv_f)
            for row in csv_f:
                row_dict = OrderedDict(zip(headers, row))
                row_dict['name'] = dict()
                for locale in ['en-US', 'he']:
                    row_dict['name'][locale] = row_dict[f'name.{locale}']
                    del row_dict[f'name.{locale}']
                locations[row_dict['key']] = row_dict

        geni = GeniClientAsync()
        with open(personalities_csv_out, "w") as csv_out:
            csv_f = csv.writer(csv_out)
            csv_f.writerow(self.headers)
            for profile_id, row_dict in BHData.DATA.items():
                if not profile_id.startswith("profile-"):
                    print(f"Converting guid {profile_id}, row: {row_dict}")
                    details,_ = await geni.get_profile_details(geni_token, profile_id=f"profile-g{profile_id}")
                    print(details)
                    if 'id' in details:
                        row_dict['geni_id'] = details['id']
                    else:
                        print(f"Can't convert guid {profile_id}")
                        continue
                # Convert location to JSON-based
                if row_dict['bh_location']:
                    row_dict['bh_location'] = json.dumps(
                        self.calc_bh_location(row_dict,
                                                 locations)
                    )
                csv_f.writerow(row_dict.values())

    def calc_bh_location(self, row_dict, locations):
        location_str = row_dict['bh_location']
        # Check if it is a predefined location
        if location_str in locations:
            return locations[location_str]
        # If location is not predefined, then parse coordinates
        (x,y) = [c.strip().lower() for c in location_str.split('-')]
        # Change
        if x[0] == 'y' and y[0] == 'x':
            c = x[1:]
            x = y[1:]
            y = c
        assert(int(x) and int(y))

        location = {
            'key': row_dict['geni_profile_name'],
            'name.en-US': row_dict['geni_profile_name'],
            'name.he': '', # TODO
            'coordinates': f'{x},{y}',
            'floor': row_dict['bh_floor']
        }
        return location

if __name__ == "__main__":
    import sys
    import asyncio
    from api.geni import GeniClientAsync
    geni = GeniClientAsync()
    authorize_url = geni.build_auth_url()
    print(f"""Caching BH personalities from Geni. Please goto: 

{authorize_url}

and paste here the token you will see in the redirected URL """)
    token = input("> ")



    bh = BHData(sys.argv[1])

    loop = asyncio.get_event_loop()
    loop.run_until_complete(bh.guid_to_profiles(token, os.path.join(os.path.dirname(sys.argv[1]), "locations.csv"), sys.argv[1] + ".profiled"))
