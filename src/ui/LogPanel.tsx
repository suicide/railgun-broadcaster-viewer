import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface LogMessage {
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
  timestamp: Date;
}

interface Props {
  logs: LogMessage[];
  isFocused: boolean;
}

export const LogPanel: React.FC<Props> = ({ logs, isFocused }) => {
  const limit = 8;
  const [offset, setOffset] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      setOffset(Math.max(0, logs.length - limit));
    }
  }, [logs.length, autoScroll]);

  useInput((input, key) => {
    if (!isFocused) return;

    if (key.upArrow || input === 'k') {
      setAutoScroll(false);
      setOffset(Math.max(0, offset - 1));
    }

    if (key.downArrow || input === 'j') {
      const maxOffset = Math.max(0, logs.length - limit);
      const nextOffset = Math.min(maxOffset, offset + 1);
      setOffset(nextOffset);

      if (nextOffset >= maxOffset) {
        setAutoScroll(true);
      }
    }

    if (key.pageUp) {
      setAutoScroll(false);
      const nextOffset = Math.max(0, offset - limit);
      setOffset(nextOffset);
    }

    if (key.pageDown) {
      const maxOffset = Math.max(0, logs.length - limit);
      const nextOffset = Math.min(maxOffset, offset + limit);
      setOffset(nextOffset);

      if (nextOffset >= maxOffset) {
        setAutoScroll(true);
      }
    }

    if (key.ctrl) {
      if (input === 'u') {
        setAutoScroll(false);
        const halfPage = Math.floor(limit / 2);
        const nextOffset = Math.max(0, offset - halfPage);
        setOffset(nextOffset);
      }
      if (input === 'd') {
        const maxOffset = Math.max(0, logs.length - limit);
        const halfPage = Math.floor(limit / 2);
        const nextOffset = Math.min(maxOffset, offset + halfPage);
        setOffset(nextOffset);

        if (nextOffset >= maxOffset) {
          setAutoScroll(true);
        }
      }
    }
  });

  const visible = logs.slice(offset, offset + limit);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      height={10}
      width="100%"
      borderColor={isFocused ? 'green' : 'white'}
    >
      <Text bold underline>
        Logs {!autoScroll && '(Paused)'}
      </Text>
      <Box flexDirection="column">
        {visible.map((log, index) => {
          let color = 'white';
          if (log.type === 'error') color = 'red';
          if (log.type === 'warn') color = 'yellow';
          if (log.type === 'success') color = 'green';
          if (log.type === 'info') color = 'blue';

          return (
            <Text key={offset + index} color={color}>
              [{log.timestamp.toLocaleTimeString()}] {log.message}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
};
