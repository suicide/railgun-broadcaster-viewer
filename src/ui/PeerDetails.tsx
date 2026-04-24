import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { PeerTableRow } from './peer-table-data.js';

interface Props {
  peer: PeerTableRow | null;
  isFocused: boolean;
  height: number;
  width: number;
}

interface DetailLine {
  key: string;
  text: string;
  color?: string;
  bold?: boolean;
}

const wrapLine = (text: string, width: number): string[] => {
  if (width <= 0 || text.length <= width) {
    return [text];
  }

  const lines: string[] = [];
  let remaining = text;

  while (remaining.length > width) {
    let splitIndex = remaining.lastIndexOf(' ', width);
    if (splitIndex <= 0) {
      splitIndex = width;
    }
    lines.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  if (remaining.length > 0) {
    lines.push(remaining);
  }

  return lines;
};

const appendWrapped = (
  lines: DetailLine[],
  key: string,
  text: string,
  width: number,
  color?: string
) => {
  wrapLine(text, width).forEach((wrappedLine, index) => {
    lines.push({
      key: `${key}-${index}`,
      text: wrappedLine,
      color,
    });
  });
};

export const PeerDetails: React.FC<Props> = ({ peer, isFocused, height, width }) => {
  const [offset, setOffset] = useState(0);
  const innerWidth = Math.max(20, width - 4);
  const visibleRows = Math.max(1, height - 2);

  const lines = useMemo<DetailLine[]>(() => {
    const lines: DetailLine[] = [];

    const addField = (label: string, value: string) => {
      const prefix = `${label}: `;
      const wrappedValue = wrapLine(value, Math.max(1, innerWidth - prefix.length));
      wrappedValue.forEach((line, index) => {
        lines.push({
          key: `${label}-${index}`,
          text: index === 0 ? `${prefix}${line}` : `${' '.repeat(prefix.length)}${line}`,
        });
      });
    };

    const addList = (label: string, values: string[]) => {
      lines.push({ key: `${label}-header`, text: `${label}:` });
      if (values.length === 0) {
        lines.push({ key: `${label}-empty`, text: '  none', color: 'gray' });
        return;
      }

      values.forEach((value, index) => {
        appendWrapped(lines, `${label}-${index}`, `  ${value}`, innerWidth);
      });
    };

    lines.push({ key: 'title', text: 'Peer Details', color: 'magenta', bold: true });

    if (!peer) {
      lines.push({ key: 'empty', text: 'No peer selected.', color: 'yellow' });
      return lines;
    }

    lines.push({ key: 'overview-header', text: 'Overview', color: 'cyan', bold: true });
    addField('Peer ID', peer.peerId);
    addField('State', peer.state);
    addField('Role', peer.role);
    addField('Source', peer.source);
    addField('Explicit', peer.isExplicit ? 'yes' : 'no');
    addField('Connected', peer.isConnected ? 'yes' : 'no');
    addField('Known', peer.isKnown ? 'yes' : 'no');
    addField('Direct', peer.isDirectPeer ? 'yes' : 'no');
    addField('Store', peer.isStorePeer ? 'yes' : 'no');
    addField('Peer Exchange', peer.supportsPeerExchange ? 'yes' : 'no');
    lines.push({ key: 'spacer-overview', text: '' });

    lines.push({ key: 'capabilities-header', text: 'Capabilities', color: 'cyan', bold: true });
    addList('Capabilities', peer.capabilities);
    lines.push({ key: 'spacer-capabilities', text: '' });

    lines.push({ key: 'tags-header', text: 'Tags', color: 'cyan', bold: true });
    addList('Tags', peer.tags);
    lines.push({ key: 'spacer-tags', text: '' });

    lines.push({ key: 'protocols-header', text: 'Protocols', color: 'cyan', bold: true });
    addList('Protocols', peer.protocols);
    lines.push({ key: 'spacer-protocols', text: '' });

    lines.push({ key: 'multiaddrs-header', text: 'Multiaddrs', color: 'cyan', bold: true });
    addList('Multiaddrs', peer.multiaddrs);

    if (!peer.isExplicit) {
      lines.push({ key: 'spacer-note', text: '' });
      appendWrapped(
        lines,
        'note',
        'Note: No explicit peers configured; this peer is discovery-derived.',
        innerWidth,
        'gray'
      );
    }

    return lines;
  }, [innerWidth, peer]);

  useEffect(() => {
    const maxOffset = Math.max(0, lines.length - visibleRows);
    if (offset > maxOffset) {
      setOffset(maxOffset);
    }
  }, [lines.length, offset, visibleRows]);

  useInput((input, key) => {
    if (!isFocused) return;

    const maxOffset = Math.max(0, lines.length - visibleRows);

    if (key.downArrow || input === 'j') {
      setOffset(Math.min(maxOffset, offset + 1));
    }

    if (key.upArrow || input === 'k') {
      setOffset(Math.max(0, offset - 1));
    }

    if (key.pageDown) {
      setOffset(Math.min(maxOffset, offset + visibleRows));
    }

    if (key.pageUp) {
      setOffset(Math.max(0, offset - visibleRows));
    }

    if (key.ctrl && input === 'd') {
      setOffset(Math.min(maxOffset, offset + Math.floor(visibleRows / 2)));
    }

    if (key.ctrl && input === 'u') {
      setOffset(Math.max(0, offset - Math.floor(visibleRows / 2)));
    }
  });

  const visibleLines = lines.slice(offset, offset + visibleRows);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      height={height}
      width={width}
      borderColor={isFocused ? 'green' : 'white'}
    >
      {visibleLines.map((line) => (
        <Text key={line.key} color={line.color} bold={line.bold} wrap="wrap">
          {line.text}
        </Text>
      ))}
    </Box>
  );
};
