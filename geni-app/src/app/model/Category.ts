export enum Category {
  HUMANITIES = 'humanities',                       //'Humanities & Religion',
  SCIENCE = 'science',                             //'Science',
  DIPLOMACY = 'diplomacy',                         //'Diplomacy',
  LAW = 'law',                                     //'Law',
  ECONOMICS = 'economics',                         //'Economics',
  HOLOCAUST = 'holocaust',                         //'The Holocaust',
  PRESS = 'press',                                 //'Press',
  MILITARY = 'military',                           //'Military',
  LITERATURE = 'literature',                       //'Literature',
  PLASTIC_ART = 'plastic_art',                     //'Plastic Art',
  CLASSICAL_MUSIC = 'classical_music',             //'Classical Music',
  POPULAR_MUSIC = 'popular_music',                 //'Popular Music',
  ARCHITECTURE = 'architecture',                   //'Architecture',
  THEATRE = 'theatre',                             //'Theatre',
  CINEMA = 'cinema',                               //'Cinema & Television',
  PHOTOGRAPHY = 'photography',                     //'Photography & Comics',
  HUMOR = 'humor',                                 //'Humor',
  SPORTS = 'sports',                               //'Sports',
  OTHER = 'other',                                 //'Other',
}

export const getColor = (category: Category) => {
  switch (category) {
    case Category.HUMANITIES:
      return '#FEC7DD';
    case Category.SCIENCE:
      return '#FEC7CD';
    case Category.DIPLOMACY:
      return '#FED0C7';
    case Category.LAW:
      return '#FEDAC7';
    case Category.ECONOMICS:
      return '#FEE7C7';
    case Category.HOLOCAUST:
      return '#FEF3C7';
    case Category.PRESS:
      return '#FCFEC7';
    case Category.MILITARY:
      return '#EEFEC7';
    case Category.LITERATURE:
      return '#E1FEC7';
    case Category.PLASTIC_ART:
      return '#CDFEC7';
    case Category.CLASSICAL_MUSIC:
      return '#C7FED6';
    case Category.POPULAR_MUSIC:
      return '#C7FEEB';
    case Category.ARCHITECTURE:
      return '#C7FEFC';
    case Category.THEATRE:
      return '#C7F3FE';
    case Category.CINEMA:
      return '#C7E4FE';
    case Category.PHOTOGRAPHY:
      return '#C7D2FE';
    case Category.HUMOR:
      return '#CEC7FE';
    case Category.SPORTS:
      return '#ECC7FE';
    default:
      return '#FEC7FE';
  }
};
