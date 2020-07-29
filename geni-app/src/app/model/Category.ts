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
  VISUAL_ART = 'visual_art',                       //'Visual Art',
  CLASSICAL_MUSIC = 'classical_music',             //'Classical Music',
  POPULAR_MUSIC = 'popular_music',                 //'Popular Music',
  ARCHITECTURE = 'architecture',                   //'Architecture',
  THEATRE = 'theatre',                             //'Theatre',
  CINEMA = 'cinema',                               //'Cinema & Television',
  HUMOR = 'humor',                                 //'Humor',
  SPORTS = 'sports',                               //'Sports',
  OTHER = 'other',                                 //'Other',

}

export const getText = (category: Category) => {
  switch (category) {
    case Category.HUMANITIES:
      return 'Humanities & Religion';
    case Category.SCIENCE:
      return 'Science';
    case Category.DIPLOMACY:
      return 'Diplomacy';
    case Category.LAW:
      return 'Law';
    case Category.ECONOMICS:
      return 'Economics';
    case Category.HOLOCAUST:
      return 'The Holocaust';
    case Category.PRESS:
      return 'Press & Media';
    case Category.MILITARY:
      return 'Military';
    case Category.LITERATURE:
      return 'Literature & Poetry';
    case Category.PLASTIC_ART:
      return 'Plastic Art';
    case Category.VISUAL_ART:
      return 'Visual Art';
    case Category.CLASSICAL_MUSIC:
      return 'Classical Music';
    case Category.POPULAR_MUSIC:
      return 'Popular Music';
    case Category.ARCHITECTURE:
      return 'Architecture';
    case Category.THEATRE:
      return 'Theatre';
    case Category.CINEMA:
      return 'Cinema & Television';
    case Category.HUMOR:
      return 'Humor';
    case Category.SPORTS:
      return 'Sports';
    default:
      return 'Other';
  }
};


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
    case Category.VISUAL_ART:
      return '#CDFEA7';
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
    case Category.HUMOR:
      return '#CEC7FE';
    case Category.SPORTS:
      return '#ECC7FE';
    default:
      return '#FEC7FE';
  }
};
