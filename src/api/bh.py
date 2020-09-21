import csv
import re
import os
from collections import OrderedDict
DEFAULT_PERSONALITIES_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "personalities.csv")


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

    def __init__(self, personalities_csv=DEFAULT_PERSONALITIES_CSV):
        self.data = dict()
        with open(personalities_csv, "r") as f:
            csv_f = csv.reader(f)
            headers = next(csv_f)
            self.headers = [re.sub("\s+", "_", h).lower() for h in headers]
            for row in csv_f:
                row_dict = OrderedDict(zip(self.headers, row))
                row_dict['bh_theme'] = self.THEME_MAP.get(row_dict['bh_theme'].strip(), "other")
                self.data[row_dict['geni_id']] = row_dict

    def get_bh_profile(self, geni_id):
        return self.data.get(geni_id, dict())

    async def guid_to_profiles(self, geni_token, personalities_csv_out):
        from api.geni import GeniClientAsync

        geni = GeniClientAsync()
        with open(personalities_csv_out, "w") as csv_out:
            csv_f = csv.writer(csv_out)
            csv_f.writerow(self.headers)
            for profile_id, row_dict in self.data.items():
                if not profile_id.startswith("profile-"):
                    print(f"Converting guid {profile_id}, row: {row_dict}")
                    details,_ = await geni.get_profile_details(geni_token, profile_id=f"profile-g{profile_id}")
                    print(details)
                    if 'id' in details:
                        row_dict['geni_id'] = details['id']
                    else:
                        print(f"Can't convert guid {profile_id}")
                        continue
                csv_f.writerow(row_dict.values())

if __name__ == "__main__":
    import sys
    import asyncio

    bh = BHData(sys.argv[1])

    loop = asyncio.get_event_loop()
    loop.run_until_complete(bh.guid_to_profiles(sys.argv[2], sys.argv[1] + ".profiled"))