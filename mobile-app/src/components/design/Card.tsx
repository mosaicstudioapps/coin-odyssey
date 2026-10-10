import React from 'react';
import { View, ViewProps } from 'react-native';
import { radius, makeStyles } from '../../theme';

interface Props extends ViewProps {
  quiet?: boolean;
}

export const Card: React.FC<Props> = ({ quiet, style, children, ...rest }) => {
  const styles = useStyles();
  return (
    <View style={[quiet ? styles.quiet : styles.card, style]} {...rest}>
      {children}
    </View>
  );
};

const useStyles = makeStyles((palette) => ({
  card: {
    backgroundColor: palette.bg2,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.base,
  },
  quiet: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.base,
  },
}));
