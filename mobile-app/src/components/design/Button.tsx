import React from 'react';
import { Pressable, Text, View, PressableProps } from 'react-native';
import { fontFamily, makeStyles } from '../../theme';

type Variant = 'gold' | 'ghost' | 'quiet';

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  flex?: number;
}

export const Button: React.FC<Props> = ({
  label,
  variant = 'gold',
  leading,
  trailing,
  flex,
  ...rest
}) => {
  const styles = useStyles();
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        styles.base,
        variant === 'gold' && styles.gold,
        variant === 'ghost' && styles.ghost,
        variant === 'quiet' && styles.quiet,
        flex !== undefined && { flex },
        pressed && styles.pressed,
      ]}
    >
      {leading as any}
      <Text
        style={[
          styles.label,
          variant === 'gold' && styles.labelGold,
        ]}
      >
        {label}
      </Text>
      {trailing as any}
    </Pressable>
  );
};

const useStyles = makeStyles((palette) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  gold: {
    backgroundColor: palette.gold,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: palette.line,
  },
  quiet: {
    backgroundColor: palette.bg3,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    letterSpacing: -0.07,
    color: palette.fg,
  },
  labelGold: {
    color: palette.goldFg,
  },
}));
