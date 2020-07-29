import csv
import re


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

    def __init__(self, personalities_csv):
        self.data = dict()
        with open(personalities_csv, "r") as f:
            csv_f = csv.reader(f)
            headers = next(csv_f)
            headers = [re.sub("\s+", "_", h).lower() for h in headers]
            for row in csv_f:
                row_dict = dict(zip(headers, row))
                row_dict['bh_theme'] = self.THEME_MAP.get(row_dict['bh_theme'].strip(), "other")
                self.data[row_dict['geni_id']] = row_dict
        print(self.data)

    def get_bh_profile(self, geni_id):
        return self.data.get(geni_id, dict())

if __name__ == "__main__":
    import sys
    bh = BHData(sys.argv[1])
