import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { fontFamily, radius, makeStyles, useTheme } from '../../theme';

interface Props extends TextInputProps {
  label: string;
  helper?: string;
  invalid?: boolean;
  rightSlot?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Field: React.FC<Props> = ({
  label,
  helper,
  invalid,
  rightSlot,
  containerStyle,
  multiline,
  style,
  ...inputProps
}) => {
  const styles = useStyles();
  const { palette, scheme } = useTheme();
  return (
    <View style={[styles.wrap, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {rightSlot as any}
      </View>
      <TextInput
        keyboardAppearance={scheme}
        placeholderTextColor={palette.fg4}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          invalid && styles.inputInvalid,
          style,
        ]}
        multiline={multiline}
        {...inputProps}
      />
      {helper ? (
        <Text style={[styles.helper, invalid && { color: palette.cLow }]}>{helper}</Text>
      ) : null}
    </View>
  );
};

const useStyles = makeStyles((palette) => ({
  wrap: { gap: 6 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.fg3,
  },
  input: {
    fontFamily: fontFamily.ui,
    fontSize: 15,
    color: palette.fg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.sm,
    backgroundColor: palette.bg2,
    minHeight: 42,
  },
  inputMultiline: {
    minHeight: 88,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  inputInvalid: {
    borderColor: palette.cLow,
  },
  helper: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: palette.fg4,
    letterSpacing: 0.5,
  },
}));
