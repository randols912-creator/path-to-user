export enum Theme {
  HUMANITIES = 'humanities',
  SCIENCE = 'science',
  DIPLOMACY = 'diplomacy',
  LAW = 'law',
  ECONOMICS = 'economics',
  HOLOCAUST = 'holocaust',
  PRESS = 'press',
  MILITARY = 'military',
  LITERATURE = 'literature',
  PLASTIC_ART = 'plastic_art',
  VISUAL_ART = 'visual_art',
  CLASSICAL_MUSIC = 'classical_music',
  POPULAR_MUSIC = 'popular_music',
  ARCHITECTURE = 'architecture',
  THEATRE = 'theatre',
  CINEMA = 'cinema',
  HUMOR = 'humor',
  SPORTS = 'sports',
  OTHER = 'other',
}

export const getColor = (theme: Theme) => {
  switch (theme) {
    case Theme.HUMANITIES:
      return '#FEC7DD';
    case Theme.SCIENCE:
      return '#FEC7CD';
    case Theme.DIPLOMACY:
      return '#FED0C7';
    case Theme.LAW:
      return '#FEDAC7';
    case Theme.ECONOMICS:
      return '#FEE7C7';
    case Theme.HOLOCAUST:
      return '#FEF3C7';
    case Theme.PRESS:
      return '#FCFEC7';
    case Theme.MILITARY:
      return '#EEFEC7';
    case Theme.LITERATURE:
      return '#E1FEC7';
    case Theme.PLASTIC_ART:
      return '#CDFEC7';
    case Theme.VISUAL_ART:
      return '#CDFEA7';
    case Theme.CLASSICAL_MUSIC:
      return '#C7FED6';
    case Theme.POPULAR_MUSIC:
      return '#C7FEEB';
    case Theme.ARCHITECTURE:
      return '#C7FEFC';
    case Theme.THEATRE:
      return '#C7F3FE';
    case Theme.CINEMA:
      return '#C7E4FE';
    case Theme.HUMOR:
      return '#CEC7FE';
    case Theme.SPORTS:
      return '#ECC7FE';
    default:
      return '#FEC7FE';
  }
};
