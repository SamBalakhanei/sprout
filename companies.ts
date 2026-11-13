import type { ImageSourcePropType } from 'react-native';

export const companies: Record<
  string,
  { name: string; sector: string; logo: ImageSourcePropType }
> = {
  AAPL: { name: 'Apple', sector: 'Technology', logo: require('./assets/logos/AAPL.png') },
  MSFT: { name: 'Microsoft', sector: 'Technology', logo: require('./assets/logos/MSFT.png') },
  KO: { name: 'Coca-Cola', sector: 'Consumer staples', logo: require('./assets/logos/KO.png') },
  JPM: { name: 'JPMorgan Chase', sector: 'Financials', logo: require('./assets/logos/JPM.jpg') },
  WMT: { name: 'Walmart', sector: 'Consumer staples', logo: require('./assets/logos/WMT.png') },
};
