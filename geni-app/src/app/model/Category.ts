export enum Category {
  HUMANITIES = 'Humanities & Religion',
  SCIENCE = 'Science',
  DIPLOMACY = 'Diplomacy',
  LAW = 'Law',
  ECONOMICS = 'Economics',
  HOLOCAUST = 'The Holocaust',
  PRESS = 'Press',
  MILITARY = 'Military',
  LITERATURE = 'Literature',
  PLASTIC_ART = 'Plastic Art',
  CLASSICAL_MUSIC = 'Classical Music',
  POPULAR_MUSIC = 'Popular Music',
  ARCHITECTURE = 'Architecture',
  THEATRE = 'Theatre',
  CINEMA = 'Cinema & Television',
  PHOTOGRAPHY = 'Photography & Comics',
  HUMOR = 'Humor',
  SPORTS = 'Sports',
  OTHER = 'Other',
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
