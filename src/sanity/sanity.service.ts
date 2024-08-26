import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { moderateScale } from 'react-native-size-matters';
import { ButtonExpand } from '@/components/Buttons/ButtonExpand';

interface Props {
  children: string;
}

const TextWithExpandButton = ({ children }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [animation] = useState(new Animated.Value(0));
  
  const sentences = useMemo(() => children.split('.').filter(sentence => sentence.trim() !== ''), [children]);
  const isExpandable = sentences.length > 5;

  const displayText = useMemo(() => {
    if (expanded || !isExpandable) {
      return children;
    }
    return sentences.slice(0, 5).join('. ') + '.';
  }, [expanded, isExpandable, sentences, children]);

  useEffect(() => {
    if (expanded) {
      Animated.timing(animation, {
        toValue: contentHeight || 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(animation, {
        toValue: moderateScale(105), // 5 linii tekstu (przy założeniu, że każda linia ma ok. 21 px wysokości)
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [expanded, contentHeight, animation]);

  const onTextLayout = (event: LayoutChangeEvent) => {
    if (!contentHeight) {
      setContentHeight(event.nativeEvent.layout.height);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <Animated.View style={{ maxHeight: animation }}>
          <Text style={styles.description} onLayout={onTextLayout}>
            {displayText}
          </Text>
        </Animated.View>
      </View>
      {isExpandable && (
        <ButtonExpand setIsExpand={toggleExpand} isExpand={expanded} />
      )}
    </>
  );

  function toggleExpand() {
    setExpanded(!expanded);
  }
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  description: {
    fontSize: moderateScale(13),
    lineHeight: moderateScale(21),
    color: 'white',
    marginTop: moderateScale(10),
    fontFamily: 'Roboto-Medium',
  },
});

export { TextWithExpandButton };
