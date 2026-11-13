import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { companies } from '../companies';
import { colors } from '../styles';

export default function CompanyLogo({ symbol, size = 44 }: { symbol: string; size?: number }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const company = companies[symbol];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {company && failedSource !== symbol ? (
        <Image
          source={company.logo}
          onError={() => setFailedSource(symbol)}
          accessibilityLabel={`${company.name} logo`}
          resizeMode="contain"
          style={{ width: size * 0.76, height: size * 0.76 }}
        />
      ) : (
        <Text style={{ color: colors.green, fontWeight: '700', fontSize: Math.max(9, size / 4) }}>
          {symbol}
        </Text>
      )}
    </View>
  );
}
