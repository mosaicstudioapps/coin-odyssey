import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  CSV_FIELD_LABELS,
  coinsToCsv,
  csvDuplicateKey,
  csvRowsToCoins,
  guessCsvMapping,
  parseCsv,
  type CsvField,
  type CsvMapping,
  type CsvRowResult,
} from '@coin-collecting/shared';

import { fontFamily, makeStyles, useTheme } from '../../theme';
import { Button, Card, Eyebrow, Icon, ProgressBar } from '../../components/design';
import { CoinService } from '../../services/coinService';
import { Logger } from '../../services/logger';
import type { Coin } from '../../types/coin';

// Export the collection as a spreadsheet (CSV) through the share sheet, or
// import one. Same file format and rules as the web app's Import and export
// page (packages/shared, coinCsv.ts): an export imports back cleanly, and
// imported rows go through the add-coin form's checks. Photos aren't included.

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
const REQUIRED: CsvField[] = ['year', 'denomination'];
/** Problems listed on screen; the rest are counted. */
const MAX_LISTED = 50;

interface LoadedFile {
  name: string;
  headers: string[];
  rows: string[][];
  mapping: CsvMapping;
}

type ImportState =
  | { step: 'idle' }
  | { step: 'saving'; saved: number; total: number }
  | { step: 'done'; saved: number }
  | { step: 'failed'; message: string };

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export default function ImportExportScreen() {
  const styles = useStyles();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [existing, setExisting] = useState<Coin[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importState, setImportState] = useState<ImportState>({ step: 'idle' });

  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const coins = await CoinService.getUserCoins();
      if (coins.length === 0) {
        setExportError('There are no coins to export yet.');
        return;
      }
      const uri = `${FileSystem.cacheDirectory}coin-odyssey-${new Date().toISOString().slice(0, 10)}.csv`;
      await FileSystem.writeAsStringAsync(uri, coinsToCsv(coins), { encoding: FileSystem.EncodingType.UTF8 });
      if (!(await Sharing.isAvailableAsync())) {
        setExportError("This device can't share files.");
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
        dialogTitle: 'Export your collection',
      });
    } catch (err) {
      Logger.error('Export failed', err);
      setExportError('Could not export. Check your connection and try again.');
    } finally {
      setExporting(false);
    }
  };

  const pickFile = async () => {
    setFileError(null);
    setImportState({ step: 'idle' });
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      if (!/\.(csv|txt)$/i.test(asset.name)) {
        setFileError('Choose a .csv file. Spreadsheet apps can save one with Export or Save as → CSV.');
        return;
      }
      if (asset.size != null && asset.size > MAX_BYTES) {
        setFileError('That file is over 5 MB. Split it into smaller files and import each.');
        return;
      }
      const [headers, ...rows] = parseCsv(await FileSystem.readAsStringAsync(asset.uri));
      if (!headers || rows.length === 0) {
        setFileError('That file has no rows under its header line.');
        return;
      }
      if (rows.length > MAX_ROWS) {
        setFileError(`That file has ${rows.length} rows; the limit is ${MAX_ROWS} at a time.`);
        return;
      }
      // Loaded now, so duplicates can be counted before anything is saved.
      setExisting(await CoinService.getUserCoins());
      setFile({ name: asset.name, headers: headers.map(h => h.trim()), rows, mapping: guessCsvMapping(headers) });
    } catch (err) {
      Logger.error('Import file could not be read', err);
      setFileError('That file could not be read.');
    }
  };

  const results = useMemo<CsvRowResult[]>(() => (file ? csvRowsToCoins(file.rows, file.mapping) : []), [file]);
  const plan = useMemo(() => {
    const have = new Set(existing.map(csvDuplicateKey));
    const ready = results.filter(r => r.fields);
    const duplicates = ready.filter(r => have.has(csvDuplicateKey(r.fields!)));
    const toSave = skipDuplicates ? ready.filter(r => !have.has(csvDuplicateKey(r.fields!))) : ready;
    const problems = results.filter(r => !r.fields || r.notes.length > 0);
    return { toSave, duplicates: duplicates.length, failed: results.filter(r => !r.fields).length, problems };
  }, [results, existing, skipDuplicates]);

  const missing = file ? REQUIRED.filter(field => file.mapping[field] === undefined) : [];
  const matched = file
    ? (Object.entries(file.mapping) as [CsvField, number][]).map(([field, i]) => `${CSV_FIELD_LABELS[field]} ← ${file.headers[i] || `column ${i + 1}`}`)
    : [];

  const runImport = async () => {
    const list = plan.toSave.map(r => r.fields!);
    setImportState({ step: 'saving', saved: 0, total: list.length });
    try {
      const saved = await CoinService.createCoins(list, n => setImportState({ step: 'saving', saved: n, total: list.length }));
      setImportState({ step: 'done', saved });
      setFile(null);
    } catch (err) {
      setImportState({ step: 'failed', message: err instanceof Error ? err.message : 'The import stopped. Please try again.' });
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 }]}>
        <View style={styles.header}>
          <Pressable hitSlop={10} onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="chevron-right" size={18} color={palette.fg2} />
            </View>
            <Text style={styles.backLabel}>BACK</Text>
          </Pressable>
          <Eyebrow>YOUR DATA</Eyebrow>
          <Text style={styles.title}>Import and export</Text>
          <Text style={styles.lede}>Move your collection in and out as a spreadsheet (CSV). Photos aren't included either way.</Text>
        </View>

        <Card style={styles.card}>
          <Eyebrow>EXPORT</Eyebrow>
          <Text style={styles.body}>
            Every coin and every field you or a scan filled in, one row per coin. Opens in Numbers, Excel, or Google Sheets, and
            imports back here or on the web.
          </Text>
          <Button
            label={exporting ? 'Preparing…' : 'Export collection'}
            onPress={exportCsv}
            disabled={exporting}
            leading={<Icon name="share" size={15} color={palette.goldFg} stroke={2} />}
          />
          {exportError && <Text style={styles.error}>{exportError}</Text>}
        </Card>

        <Card style={styles.card}>
          <Eyebrow>IMPORT</Eyebrow>
          <Text style={styles.body}>
            A CSV with a header row. Each row needs at least a year and a denomination. You'll see what will be added before anything
            is saved.
          </Text>
          <Button label="Choose a CSV file" variant="ghost" onPress={pickFile} disabled={importState.step === 'saving'} />
          {fileError && <Text style={styles.error}>{fileError}</Text>}
          {importState.step === 'done' && (
            <Text style={styles.success}>Added {plural(importState.saved, 'coin')} to your collection.</Text>
          )}
        </Card>

        {file && (
          <Card style={styles.card}>
            <Eyebrow>REVIEW · {file.name.toUpperCase()}</Eyebrow>
            <Text style={styles.meta}>{plural(file.rows.length, 'row').toUpperCase()}</Text>
            <View style={styles.matched}>
              {matched.map(line => (
                <Text key={line} style={styles.matchedLine}>
                  {line}
                </Text>
              ))}
            </View>

            {missing.length > 0 ? (
              <Text style={styles.error}>
                No column for {missing.map(f => CSV_FIELD_LABELS[f].toLowerCase()).join(' or ')} was found. Rename that column's
                header (for example "Year" or "Denomination"), or import on the web, where you can choose columns.
              </Text>
            ) : (
              <>
                <Text style={styles.ready}>
                  {plan.toSave.length > 0 ? `Ready to add ${plural(plan.toSave.length, 'coin')}` : 'Nothing new to add'}
                </Text>
                {plan.failed > 0 && <Text style={styles.body}>{plural(plan.failed, 'row')} can't be imported (listed below).</Text>}
                {plan.duplicates > 0 && (
                  <View style={styles.toggleRow}>
                    <Text style={[styles.body, { flex: 1 }]}>
                      Skip {plural(plan.duplicates, 'coin')} already in my collection
                    </Text>
                    <Switch
                      value={skipDuplicates}
                      onValueChange={setSkipDuplicates}
                      trackColor={{ true: palette.gold, false: palette.bg4 }}
                      accessibilityLabel="Skip coins already in my collection"
                    />
                  </View>
                )}

                {importState.step === 'saving' ? (
                  <View style={{ gap: 8 }}>
                    <ProgressBar value={importState.total ? importState.saved / importState.total : 0} />
                    <Text style={styles.meta}>
                      {importState.saved} / {importState.total}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <Button label="Cancel" variant="ghost" onPress={() => setFile(null)} flex={1} />
                    <Button
                      label={`Add ${plural(plan.toSave.length, 'coin')}`}
                      onPress={runImport}
                      disabled={plan.toSave.length === 0}
                      flex={1.4}
                    />
                  </View>
                )}
                {importState.step === 'failed' && <Text style={styles.error}>{importState.message}</Text>}
                {importState.step === 'saving' && <ActivityIndicator color={palette.goldText} />}

                {plan.problems.length > 0 && (
                  <View style={styles.problems}>
                    {plan.problems.slice(0, MAX_LISTED).map(row => (
                      <View key={row.line} style={styles.problem}>
                        <Text style={styles.problemLine}>LINE {row.line}</Text>
                        <Text style={[styles.problemText, !row.fields && { color: palette.cLow }]}>
                          {[...row.errors, ...row.notes].join(' ')}
                          {!row.fields ? ' Not imported.' : ''}
                        </Text>
                      </View>
                    ))}
                    {plan.problems.length > MAX_LISTED && (
                      <Text style={styles.meta}>AND {plan.problems.length - MAX_LISTED} MORE</Text>
                    )}
                  </View>
                )}
              </>
            )}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { paddingHorizontal: 20, gap: 14 },
  header: { paddingTop: 8, paddingBottom: 6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14, alignSelf: 'flex-start' },
  backLabel: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg2, letterSpacing: 1.2 },
  title: { fontFamily: fontFamily.display, fontSize: 26, color: palette.fg, letterSpacing: -0.5, marginTop: 6 },
  lede: { fontFamily: fontFamily.ui, fontSize: 14, color: palette.fg2, lineHeight: 20, marginTop: 8 },
  card: { padding: 16, gap: 12 },
  body: { fontFamily: fontFamily.ui, fontSize: 13.5, color: palette.fg2, lineHeight: 19 },
  meta: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg3, letterSpacing: 0.8 },
  error: { fontFamily: fontFamily.ui, fontSize: 13, color: palette.cLow, lineHeight: 18 },
  success: { fontFamily: fontFamily.ui, fontSize: 13.5, color: palette.goldText },
  ready: { fontFamily: fontFamily.display, fontSize: 19, color: palette.fg },
  matched: { gap: 3 },
  matchedLine: { fontFamily: fontFamily.mono, fontSize: 10.5, color: palette.fg3 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  problems: { borderTopWidth: 1, borderTopColor: palette.line2, paddingTop: 8 },
  problem: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  problemLine: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg3, width: 56 },
  problemText: { flex: 1, fontFamily: fontFamily.ui, fontSize: 12.5, color: palette.fg2, lineHeight: 17 },
}));
