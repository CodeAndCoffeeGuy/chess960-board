# @chess960/board

A custom React chess board component optimized for Chess960 (Fischer Random Chess). Built from scratch for complete control over Chess960-specific behavior.

## Features

-  **Native Chess960 Support** - Proper FEN handling with correct piece placement
-  **Customizable Themes** - Board colors and piece sets
-  **Orientation Control** - View from white or black perspective
-  **Read-only Mode** - Perfect for spectator/featured games
-  **Smooth Animations** - Configurable move animations with ghost piece during drag
-  **Interactive Features** - Drag & drop, arrow drawing, premoves, promotion support
-  **Rook Castling UI** - Castling by clicking the rook
-  **Keyboard Input** - Enter moves using keyboard (UCI/SAN notation)
-  **Touch Optimizations** - Configurable touch ignore radius for mobile
-  **Move Sounds** - Audio feedback for different move types
-  **Click-to-Move Mode** - Alternative to drag & drop input method
-  **Blindfold Mode** - Hide pieces for blindfold training
-  **Resize Handle** - Dynamically resize the board
-  **Erase Arrows on Click** - Remove arrows by clicking them
-  **TypeScript** - Fully typed with comprehensive type definitions
-  **Zero Dependencies** - Only peer dependencies (React, chess.js)
-  **Framework Agnostic** - Works with any React setup (Next.js, Vite, etc.)

## Installation

```bash
npm install @chess960/board chess.js
# or
yarn add @chess960/board chess.js
# or
pnpm add @chess960/board chess.js
```

## Quick Start

```tsx
import { Chess960Board } from '@chess960/board';
import { Chess } from 'chess.js';

function MyChessGame() {
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());

  const handleMove = (from: string, to: string) => {
    try {
      chess.move({ from, to });
      setFen(chess.fen());
    } catch (error) {
      console.error('Invalid move:', error);
    }
  };

  return (
    <Chess960Board
      fen={fen}
      orientation="white"
      width={400}
      onMove={handleMove}
      showCoordinates={true}
    />
  );
}
```

## Props

### `Chess960BoardProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fen` | `string?` | Standard starting position | FEN string representing the current position |
| `orientation` | `'white' \| 'black'` | `'white'` | Board orientation (white shows white at bottom) |
| `width` | `number` | `280` | Board width in pixels (board is always square) |
| `onMove` | `(from: Square, to: Square) => void?` | - | Callback when a move is attempted |
| `readOnly` | `boolean` | `false` | If true, board is read-only and moves are disabled |
| `showCoordinates` | `boolean` | `true` | If true, shows file (a-h) and rank (1-8) labels |
| `theme` | `BoardTheme?` | Default brown theme | Custom board theme colors |
| `pieceSet` | `PieceSet?` | `'cburnett'` | Custom piece set configuration |
| `piecesBaseUrl` | `string?` | `'/pieces'` | Base URL for piece images |
| `animationDuration` | `number?` | `200` | Animation duration in milliseconds (0 to disable animations) |
| `currentPlayerColor` | `'white' \| 'black'?` | - | Current player color for turn validation |
| `arrows` | `Arrow[]?` | `[]` | Arrows to display on the board |
| `onArrowsChange` | `(arrows: Arrow[]) => void?` | - | Callback when arrows change (for arrow drawing) |
| `enablePremove` | `boolean?` | `false` | Enable premove support (allow moves when not player's turn) |
| `onPromotionSelect` | `(piece: PieceType) => void?` | - | Callback for promotion piece selection |
| `lastMove` | `[Square, Square] \| null?` | - | Last move squares to highlight (from, to) |
| `selectedSquare` | `Square \| null?` | - | Square that is currently selected |
| `legalMoves` | `Square[]?` | `[]` | Legal moves from selected square |

### Type Definitions

```typescript
interface BoardTheme {
  light: string; // Light square color (hex, rgb, etc.)
  dark: string;  // Dark square color (hex, rgb, etc.)
}

interface PieceSet {
  path: string; // Piece set folder name (e.g., 'cburnett', 'staunton')
}

type Square = string; // e.g., 'e2', 'f4'
type Color = 'white' | 'black';
```

## Examples

### Chess960 Starting Position

```tsx
import { Chess960Board } from '@chess960/board';
import { getChess960Position } from '@chess960/utils';

const position = getChess960Position(518); // Random Chess960 position

<Chess960Board
  fen={position.fen}
  orientation="white"
  width={400}
/>
```

### Custom Theme

```tsx
<Chess960Board
  fen={fen}
  theme={{
    light: '#f0d9b5',
    dark: '#b58863',
  }}
  pieceSet={{ path: 'staunton' }}
  piecesBaseUrl="/assets/pieces"
/>
```

### Read-only Spectator View

```tsx
<Chess960Board
  fen={gameFen}
  orientation="white"
  readOnly={true}
  showCoordinates={true}
  width={320}
/>
```

### Custom Animation Duration

```tsx
<Chess960Board
  fen={fen}
  onMove={handleMove}
  animationDuration={300} // 300ms animations (slower)
/>

// Or disable animations completely
<Chess960Board
  fen={fen}
  onMove={handleMove}
  animationDuration={0} // No animations (instant updates)
/>
```

The `animationDuration` prop controls:
- Piece move animations (default: 200ms)
- Captured piece fade-out animations
- Setting to `0` disables all animations for instant updates

### Rook Castling UI

Enable castling by clicking the rook:

```tsx
<Chess960Board
  fen={fen}
  onMove={handleMove}
  rookCastle={true} // Default: true
/>
```

When enabled, clicking a rook will automatically attempt to castle with the king if legal.

### Touch/Mobile Optimizations

Configure touch ignore radius to prevent accidental touches on mobile:

```tsx
<Chess960Board
  fen={fen}
  onMove={handleMove}
  touchIgnoreRadius={1} // Ignore touches within 1 square of boundaries
/>
```

### Keyboard Move Input

Enable keyboard move input for faster gameplay:

```tsx
<Chess960Board
  fen={fen}
  onMove={handleMove}
  enableKeyboard={true}
/>
```

Supported formats:
- **UCI**: `e2e4` - Auto-submits when 4 characters are entered
- **SAN**: `Nf3`, `e4`, `O-O` (castling) - Press Enter to submit
- **Castling**: `o-o` or `0-0` for kingside, `o-o-o` or `0-0-0` for queenside

Use `Escape` to clear input, `Backspace` to delete last character.

### Move Sounds

Enable sound effects for moves:

```tsx
<Chess960Board
  fen={fen}
  onMove={handleMove}
  sounds={{
    enabled: true,
    baseUrl: '/sounds', // Default: '/sounds'
    files: {
      move: 'move.mp3',
      capture: 'capture.mp3',
      check: 'check.mp3',
      castle: 'castle.mp3',
      promotion: 'promote.mp3',
    },
  }}
/>
```

Sounds are automatically selected based on move type:
- `move` - Regular moves
- `capture` - Capturing moves
- `check` - Moves that put opponent in check
- `castle` - Castling moves
- `promotion` - Pawn promotion moves

### Click-to-Move Mode

Configure input mode to use click-to-move instead of (or in addition to) drag & drop:

```tsx
<Chess960Board
  fen={fen}
  onMove={handleMove}
  moveInputMode="click" // 'drag' | 'click' | 'both' (default: 'both')
/>
```

Options:
- `'both'` - Both drag & drop and click-to-move enabled (default)
- `'drag'` - Only drag & drop enabled
- `'click'` - Only click-to-move enabled (click piece, then click destination)

### Blindfold Mode

Hide pieces while keeping the board visible (useful for blindfold training):

```tsx
<Chess960Board
  fen={fen}
  onMove={handleMove}
  blindfold={true}
/>
```

In blindfold mode, pieces are hidden but you can still make moves using keyboard input or if you know the board positions.

### Resize Handle

Enable a resize handle to dynamically resize the board:

```tsx
<Chess960Board
  fen={fen}
  onMove={handleMove}
  enableResize={true}
  onResize={(newWidth) => console.log('Board resized to:', newWidth)}
/>
```

The resize handle appears in the bottom-right corner when hovering. Drag to resize the board between 200px and 800px width.

### Erase Arrows on Click

Enable clicking on arrows to erase them:

```tsx
<Chess960Board
  fen={fen}
  arrows={arrows}
  onArrowsChange={setArrows}
  eraseArrowsOnClick={true}
/>
```

When enabled, clicking on any arrow (at its start or end square) will remove it from the board.

## Piece Sets

The component expects piece images at:
```
{piecesBaseUrl}/{pieceSet.path}/{w|b}{PIECE_TYPE}.svg
```

For example:
- `/pieces/cburnett/wK.svg` - White King
- `/pieces/cburnett/bQ.svg` - Black Queen
- `/pieces/staunton/wP.svg` - White Pawn

Common piece sets:
- `cburnett` - Cburnett piece set (default)
- `staunton` - Staunton pieces
- `merida` - Merida pieces
- `alpha` - Alpha pieces

## Chess960 Support

This component is specifically designed for Chess960 positions:

- Correctly handles FEN strings from Chess960 games
- Proper piece placement (white pieces on rank 1, black on rank 8)
- Works with standard chess positions too

```tsx
import { getRandomChess960Position } from '@chess960/utils';

const position = getRandomChess960Position();

<Chess960Board
  fen={position.fen}
  orientation="white"
/>
```

## Styling

The component uses inline styles for positioning and theming. For custom styling, you can wrap it:

```tsx
<div style={{ padding: '20px', background: '#2a2926' }}>
  <Chess960Board fen={fen} width={400} />
</div>
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related Projects

- [@chess960/utils](https://github.com/CodeAndCoffeeGuy/chess960) - Chess960 utilities and position generation

