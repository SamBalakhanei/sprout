import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportStudyData } from './backend';
import { csv } from './csv';

export async function shareStudyData() {
  const data = await exportStudyData();
  const rows = Object.entries(data).flatMap(([table, records]) =>
    records.map((record) => ({ table, ...(record as Record<string, unknown>) })),
  );
  const contents = csv(rows);
  const filename = `sprout-study-${new Date().toISOString().slice(0, 10)}.csv`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } else {
    const file = new File(Paths.cache, filename);
    file.write(contents);
    if (!(await Sharing.isAvailableAsync()))
      throw new Error('File sharing is not available on this device.');
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
    });
  }
}
