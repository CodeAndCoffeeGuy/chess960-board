import { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chess960Board } from '@chess960/board';
import { getRandomChess960Position } from './chess960-utils';

// Generate a random Chess960 starting position
function App() {
  // Generate a random Chess960 position on mount
  const initialPosition = useMemo(() => {
    const pos = getRandomChess960Position();
    return pos.fen;
  }, []);

  const [chess] = useState(() => new Chess(initialPosition));
  const [fen, setFen] = useState(chess.fen());
  const [lastMove, setLastMove] = useState<[string, string] | null>(null);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [readOnly, setReadOnly] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(200);
  const [showDestinations, setShowDestinations] = useState(true);
  const [enableKeyboard, setEnableKeyboard] = useState(false);
  const [arrows, setArrows] = useState<Array<{ startSquare: string; endSquare: string; color?: string }>>([]);
  const [boardTheme, setBoardTheme] = useState({
    light: '#f0d9b5',
    dark: '#b58863',
  });
  const [pieceSet] = useState({ path: 'cburnett' });

  const handleMove = useCallback((from: string, to: string, promotion?: 'p' | 'r' | 'n' | 'b' | 'q' | 'k') => {
    try {
      const move = chess.move({ from, to, promotion });
      if (move) {
        setFen(chess.fen());
        setLastMove([move.from, move.to]);
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
  }, [chess]);

  const resetBoard = () => {
    // Generate a new random Chess960 position
    const newPos = getRandomChess960Position();
    chess.load(newPos.fen);
    setFen(chess.fen());
    setLastMove(null);
    setArrows([]);
  };

  const handlePromotionSelect = useCallback((piece: 'p' | 'r' | 'n' | 'b' | 'q' | 'k') => {
    // Promotion handled in handleMove callback
  }, []);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#1f1d1a',
      overflow: 'hidden'
    }}>
      {/* Control Panel */}
      <div style={{
        padding: '12px',
        background: '#2a2926',
        borderBottom: '1px solid #3e3a33',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
        fontSize: '14px',
      }}>
        <button
          onClick={resetBoard}
          style={{
            padding: '6px 12px',
            background: '#3a3632',
            border: '1px solid #474239',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
        <button
          onClick={() => setOrientation(prev => prev === 'white' ? 'black' : 'white')}
          style={{
            padding: '6px 12px',
            background: '#3a3632',
            border: '1px solid #474239',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Flip Board
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c1b9ad' }}>
          <input
            type="checkbox"
            checked={readOnly}
            onChange={(e) => setReadOnly(e.target.checked)}
          />
          Read Only
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c1b9ad' }}>
          <input
            type="checkbox"
            checked={showDestinations}
            onChange={(e) => setShowDestinations(e.target.checked)}
          />
          Show Destinations
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c1b9ad' }}>
          <input
            type="checkbox"
            checked={enableKeyboard}
            onChange={(e) => setEnableKeyboard(e.target.checked)}
          />
          Keyboard Input
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c1b9ad' }}>
          <span>Animation:</span>
          <input
            type="range"
            min="0"
            max="500"
            step="50"
            value={animationDuration}
            onChange={(e) => setAnimationDuration(Number(e.target.value))}
          />
          <span>{animationDuration}ms</span>
        </label>
        <button
          onClick={() => setArrows([])}
          style={{
            padding: '6px 12px',
            background: '#3a3632',
            border: '1px solid #474239',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Clear Arrows ({arrows.length})
        </button>
      </div>

      {/* Chess Board - Full Screen */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflow: 'auto',
      }}>
        <Chess960Board
          fen={fen}
          orientation={orientation}
          width={Math.min(window.innerHeight - 200, window.innerWidth - 40)}
          onMove={handleMove}
          readOnly={readOnly}
          showCoordinates={true}
          theme={boardTheme}
          pieceSet={pieceSet}
          lastMove={lastMove}
          arrows={arrows}
          onArrowsChange={setArrows}
          enablePremove={true}
          onPromotionSelect={handlePromotionSelect}
          animationDuration={animationDuration}
          showDestinations={showDestinations}
          rookCastle={true}
          enableKeyboard={enableKeyboard}
          moveInputMode="both"
        />
      </div>

      {/* Status Bar */}
      <div style={{
        padding: '8px 12px',
        background: '#2a2926',
        borderTop: '1px solid #3e3a33',
        fontSize: '12px',
        color: '#a0958a',
        textAlign: 'center',
      }}>
        <span>Turn: {chess.turn() === 'w' ? 'White' : 'Black'}</span>
        {chess.isCheck() && <span style={{ color: '#ff6b6b', marginLeft: '12px' }}>Check!</span>}
        {chess.isCheckmate() && <span style={{ color: '#ff6b6b', marginLeft: '12px' }}>Checkmate!</span>}
        {chess.isDraw() && <span style={{ color: '#ffd93d', marginLeft: '12px' }}>Draw!</span>}
      </div>
    </div>
  );
}

export default App;

