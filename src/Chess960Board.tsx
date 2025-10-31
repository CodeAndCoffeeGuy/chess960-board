/**
 * Chess960Board - A custom chess board component optimized for Chess960 (Fischer Random Chess)
 * Built from scratch for complete control over Chess960-specific behavior
 * 
 * Features:
 * - Native Chess960 support with proper FEN handling
 * - Correct piece placement (white at rank 1, black at rank 8)
 * - Theme support (board colors, piece sets)
 * - Read-only mode for spectator/featured games
 * - Smooth piece move animations (configurable duration)
 * - Ghost piece during drag
 * - Arrow drawing and square highlighting
 * - Premove support
 * - Promotion handling
 * - Clean, maintainable codebase
 * 
 * @packageDocumentation
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import type { Chess960BoardProps, Piece, PieceType, Square } from './types';

// Component for animated piece
function AnimatedPiece({
  fromX,
  fromY,
  dx,
  dy,
  piece,
  squareSize,
  animationDuration,
  getPieceImage,
}: {
  fromX: number;
  fromY: number;
  dx: number;
  dy: number;
  piece: Piece;
  squareSize: number;
  animationDuration: number;
  getPieceImage: (piece: Piece) => string;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip animation if duration is 0
    if (animationDuration === 0) {
      setIsAnimating(true);
      return;
    }
    
    // Trigger animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    });
  }, [animationDuration]);

  return (
    <div
      ref={ref}
      className="absolute pointer-events-none"
      style={{
        left: `${fromX}px`,
        top: `${fromY}px`,
        width: squareSize,
        height: squareSize,
        transform: isAnimating ? `translate(${dx}px, ${dy}px)` : 'translate(0, 0)',
        transition: `transform ${animationDuration}ms ease-in-out`,
        zIndex: 100,
      }}
    >
      <img
        src={getPieceImage(piece)}
        alt={`${piece.color} ${piece.type}`}
        className="w-full h-full object-contain select-none"
        draggable={false}
      />
    </div>
  );
}

const DEFAULT_BOARD_THEME = {
  light: '#f0d9b5',
  dark: '#b58863',
};

const DEFAULT_PIECE_SET = {
  path: 'cburnett',
};

export function Chess960Board({
  fen,
  orientation = 'white',
  width = 280,
  onMove,
  readOnly = false,
  showCoordinates = true,
  theme = DEFAULT_BOARD_THEME,
  pieceSet = DEFAULT_PIECE_SET,
  piecesBaseUrl = '/pieces',
  lastMove,
  selectedSquare: externalSelectedSquare,
  legalMoves = [],
  currentPlayerColor,
  arrows = [],
  onArrowsChange,
  enablePremove = false,
  onPromotionSelect,
  animationDuration = 200,
  showDestinations = true,
  snapToValidMoves = true,
  rookCastle = true,
  touchIgnoreRadius = 0,
  enableKeyboard = false,
  onKeyboardInput,
  sounds,
  moveInputMode = 'both',
  blindfold = false,
  enableResize = false,
  onResize,
  eraseArrowsOnClick = false,
}: Chess960BoardProps) {
  const [chess] = useState(() => new Chess(fen));
  const [boardState, setBoardState] = useState<Piece[][]>([]);
  const [previousBoardState, setPreviousBoardState] = useState<Piece[][]>([]);
  const [animatingPieces, setAnimatingPieces] = useState<Map<string, { from: Square; to: Square; piece: Piece }>>(new Map());
  const [capturedPieces, setCapturedPieces] = useState<Map<string, { square: Square; piece: Piece }>>(new Map());
  const [internalSelectedSquare, setInternalSelectedSquare] = useState<Square | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<{ square: Square; piece: Piece } | null>(null);
  const [dragOverSquare, setDragOverSquare] = useState<Square | null>(null);
  const [ghostPiecePosition, setGhostPiecePosition] = useState<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [rightClickedSquares, setRightClickedSquares] = useState<Record<Square, { backgroundColor: string }>>({});
  const [arrowStart, setArrowStart] = useState<Square | null>(null);
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const [premoves, setPremoves] = useState<Array<{ from: Square; to: Square }>>([]);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [keyboardInput, setKeyboardInput] = useState<string>('');
  const keyboardInputRef = useRef<string>('');
  const [internalWidth, setInternalWidth] = useState<number>(width);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; y: number; width: number } | null>(null);
  
  // Update internal width when prop changes
  useEffect(() => {
    setInternalWidth(width);
  }, [width]);
  
  // Use external selectedSquare if provided, otherwise use internal state
  const selectedSquare = externalSelectedSquare !== undefined ? externalSelectedSquare : internalSelectedSquare;
  
  // Determine if drag should be enabled based on moveInputMode
  const isDragEnabled = moveInputMode === 'drag' || moveInputMode === 'both';
  const isClickEnabled = moveInputMode === 'click' || moveInputMode === 'both';
  
  // Check if king is in check
  const isInCheck = useCallback(() => {
    try {
      return chess.inCheck();
    } catch {
      return false;
    }
  }, [chess]);
  
  const inCheck = isInCheck();
  
  // Convert rank/file to square notation - defined early for use in callbacks
  const rankFileToSquare = useCallback((rank: number, file: number): Square => {
    const files = 'abcdefgh';
    const ranks = '87654321'; // rank 0 = rank 8, rank 7 = rank 1
    return `${files[file]}${ranks[rank]}`;
  }, []);
  
  // Get the square of the king in check
  const getKingInCheckSquare = useCallback((): Square | null => {
    if (!inCheck) return null;
    try {
      const turn = chess.turn();
      const board = chess.board();
      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const piece = board[rank][file];
          if (piece && piece.type === 'k' && piece.color === turn) {
            return rankFileToSquare(rank, file);
          }
        }
      }
    } catch {
      return null;
    }
    return null;
  }, [chess, inCheck, rankFileToSquare]);
  
  const checkSquare = getKingInCheckSquare();

  // Parse FEN and convert to board state
  const parseFen = useCallback((fenString: string): Piece[][] => {
    const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    
    try {
      const chess = new Chess(fenString);
      const position = chess.board();
      
      // Convert chess.js board format to our format
      // chess.js: [rank8, rank7, ..., rank1] where rank8 is index 0
      // We want: [rank8, rank7, ..., rank1] for display
      position.forEach((rank, rankIndex) => {
        rank.forEach((square, fileIndex) => {
          if (square) {
            board[rankIndex][fileIndex] = {
              type: square.type as PieceType,
              color: square.color === 'w' ? 'white' : 'black',
            };
          }
        });
      });
    } catch (error) {
      console.error('[Chess960Board] Error parsing FEN:', fenString, error);
    }
    
    return board;
  }, []);

  // Update board state when FEN changes and detect moves for animation
  useEffect(() => {
    if (fen) {
      try {
        const previousFen = chess.fen();
        chess.load(fen);
        const newBoardState = parseFen(fen);
        
        // Only animate if we have a previous state and animations are enabled
        if (previousBoardState.length > 0 && animationDuration > 0 && previousFen !== fen) {
          detectAndAnimateMoves(previousBoardState, newBoardState);
        }
        
        setPreviousBoardState(boardState.length > 0 ? [...boardState] : newBoardState);
        setBoardState(newBoardState);
      } catch (error) {
        console.error('[Chess960Board] Error loading FEN:', fen, error);
        // Fallback to standard starting position
        chess.reset();
        const newBoardState = parseFen(chess.fen());
        setPreviousBoardState(boardState.length > 0 ? [...boardState] : newBoardState);
        setBoardState(newBoardState);
      }
    } else {
      // If no FEN provided, use standard starting position
      chess.reset();
      const newBoardState = parseFen(chess.fen());
      setPreviousBoardState(boardState.length > 0 ? [...boardState] : newBoardState);
      setBoardState(newBoardState);
    }
  }, [fen, chess, parseFen, animationDuration]);

  // Detect moves and set up animations - simplified version
  const detectAndAnimateMoves = useCallback((oldBoard: Piece[][], newBoard: Piece[][]) => {
    const animating = new Map<string, { from: Square; to: Square; piece: Piece }>();
    const captured = new Map<string, { square: Square; piece: Piece }>();
    
    // Simple approach: find pieces in new board and check if they moved
    const piecesMovedFrom = new Set<string>();
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const oldPiece = oldBoard[rank]?.[file];
        const newPiece = newBoard[rank]?.[file];
        const square = rankFileToSquare(rank, file);
        
        // Check if piece at this square changed
        if (oldPiece && (!newPiece || newPiece.color !== oldPiece.color || newPiece.type !== oldPiece.type)) {
          // Piece was removed from this square - check if it moved or was captured
          let moved = false;
          
          // Search for same piece in new board at a different square
          for (let newRank = 0; newRank < 8; newRank++) {
            for (let newFile = 0; newFile < 8; newFile++) {
              const testPiece = newBoard[newRank]?.[newFile];
              if (testPiece && testPiece.color === oldPiece.color && testPiece.type === oldPiece.type) {
                const newSquare = rankFileToSquare(newRank, newFile);
                if (newSquare !== square) {
                  // Found the piece at a new location - it moved
                  const animKey = `${newSquare}-${oldPiece.color}-${oldPiece.type}`;
                  animating.set(animKey, {
                    from: square,
                    to: newSquare,
                    piece: oldPiece,
                  });
                  piecesMovedFrom.add(square);
                  moved = true;
                  break;
                }
              }
            }
            if (moved) break;
          }
          
          // If piece wasn't found elsewhere, it was captured
          if (!moved) {
            captured.set(square, { square, piece: oldPiece });
          }
        }
      }
    }
    
    setAnimatingPieces(animating);
    setCapturedPieces(captured);
    
    // Clear animations after duration
    if (animating.size > 0 || captured.size > 0) {
      setTimeout(() => {
        setAnimatingPieces(new Map());
        setCapturedPieces(new Map());
      }, animationDuration);
    }
  }, [rankFileToSquare, animationDuration]);

  // Get square color (light or dark)
  const getSquareColor = useCallback((rank: number, file: number): 'light' | 'dark' => {
    return (rank + file) % 2 === 0 ? 'dark' : 'light';
  }, []);


  // Convert square notation to rank/file
  const squareToRankFile = useCallback((square: Square): { rank: number; file: number } => {
    const file = square.charCodeAt(0) - 97; // 'a' = 0
    const rank = 8 - parseInt(square[1]); // '8' = 0, '1' = 7
    return { rank, file };
  }, []);

  // Calculate legal moves for selected square
  const calculatedLegalMoves = useMemo(() => {
    if (!selectedSquare || readOnly || !showDestinations) return [];
    try {
      const moves = chess.moves({ square: selectedSquare as any, verbose: true });
      return moves.map((move: any) => move.to);
    } catch {
      return [];
    }
  }, [selectedSquare, chess, readOnly, showDestinations]);
  
  // Use provided legalMoves or calculate them
  // Only show destinations if showDestinations is true
  const effectiveLegalMoves = showDestinations 
    ? (legalMoves.length > 0 ? legalMoves : calculatedLegalMoves)
    : [];

  // Sound helper function (defined early for use in handlers)
  const playSound = useCallback((soundType: 'move' | 'capture' | 'check' | 'castle' | 'promotion') => {
    if (!sounds?.enabled) return;
    
    const soundFiles = {
      move: sounds.files?.move || 'move.mp3',
      capture: sounds.files?.capture || 'capture.mp3',
      check: sounds.files?.check || 'check.mp3',
      castle: sounds.files?.castle || 'castle.mp3',
      promotion: sounds.files?.promotion || 'promote.mp3',
    };
    
    const baseUrl = sounds.baseUrl || '/sounds';
    const audio = new Audio(`${baseUrl}/${soundFiles[soundType]}`);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Silently fail if audio can't play (e.g., user hasn't interacted)
    });
  }, [sounds]);
  
  // Handle square click with rook castling support and arrow erase
  const handleSquareClick = useCallback((rank: number, file: number, event?: React.MouseEvent | React.TouchEvent) => {
    if (readOnly || !onMove) return;
    
    // Check for arrow erase first
    if (eraseArrowsOnClick && arrows.length > 0 && onArrowsChange) {
      const square = rankFileToSquare(rank, file);
      // Check if click is on an arrow (check if square is start or end of any arrow)
      const clickedArrow = arrows.find(arrow => arrow.startSquare === square || arrow.endSquare === square);
      if (clickedArrow) {
        // Remove the clicked arrow
        const updatedArrows = arrows.filter(arrow => arrow !== clickedArrow);
        onArrowsChange(updatedArrows);
        return;
      }
    }
    
    if (!isClickEnabled) return;

    const square = rankFileToSquare(rank, file);
    
    if (selectedSquare) {
      // Try to make a move
      if (selectedSquare !== square) {
        // Check if it's a legal move
        if (effectiveLegalMoves.length === 0 || effectiveLegalMoves.includes(square)) {
          // Determine move type for sound
          const targetPiece = boardState[rank]?.[file];
          const isCapture = !!targetPiece;
          const sourcePiece = chess.get(selectedSquare as any);
          const isPawn = sourcePiece?.type === 'p';
          const targetRank = square[1];
          const isPromotion = isPawn && (
            (sourcePiece?.color === 'w' && targetRank === '8') ||
            (sourcePiece?.color === 'b' && targetRank === '1')
          );
          
          // Try to detect castling
          let isCastle = false;
          if (sourcePiece?.type === 'k') {
            const fileDiff = Math.abs(square.charCodeAt(0) - selectedSquare.charCodeAt(0));
            if (fileDiff === 2) {
              isCastle = true;
            }
          }
          
          // Check if move puts opponent in check
          try {
            const testChess = new Chess(chess.fen());
            const move = testChess.move({ from: selectedSquare as any, to: square });
            if (move) {
              const isCheck = testChess.inCheck();
              
              // Play appropriate sound
              if (isCastle) {
                playSound('castle');
              } else if (isPromotion) {
                playSound('promotion');
              } else if (isCheck) {
                playSound('check');
              } else if (isCapture) {
                playSound('capture');
              } else {
                playSound('move');
              }
            }
          } catch (error) {
            // Move might be invalid, but still try to play move sound
            playSound('move');
          }
          
          onMove(selectedSquare, square);
        }
      }
      if (externalSelectedSquare === undefined) {
        setInternalSelectedSquare(null);
      }
    } else {
      // Select a piece
      const piece = boardState[rank]?.[file];
      if (piece) {
        // Rook castling: if rook is clicked and rookCastle is enabled, try to castle
        if (rookCastle && piece.type === 'r') {
          // Check if it's the player's rook
          const pieceColor = piece.color === 'white' ? 'white' : 'black';
          if (!currentPlayerColor || pieceColor === currentPlayerColor) {
            try {
              // Find the king of the same color
              const kingRank = pieceColor === 'white' ? 7 : 0; // Rank 7 for white, 0 for black
              let kingSquare: Square | null = null;
              
              for (let f = 0; f < 8; f++) {
                const testSquare = rankFileToSquare(kingRank, f);
                const testPiece = chess.get(testSquare as any);
                if (testPiece && testPiece.type === 'k' && testPiece.color === (pieceColor === 'white' ? 'w' : 'b')) {
                  kingSquare = testSquare;
                  break;
                }
              }
              
              if (kingSquare) {
                // Check if castling is legal
                const moves = chess.moves({ square: kingSquare as any, verbose: true });
                const castlingMove = moves.find((move: any) => 
                  move.flags?.includes('k') || move.flags?.includes('q')
                );
                
                if (castlingMove) {
                  // Determine castling direction based on rook position
                  const rookFile = file;
                  const kingFile = kingSquare.charCodeAt(0) - 97;
                  const isKingside = rookFile > kingFile;
                  
                  // Find the correct castling move
                  const castleMove = moves.find((move: any) => {
                    const isKingSide = move.to.charCodeAt(0) > move.from.charCodeAt(0);
                    return (isKingside && isKingSide && move.flags?.includes('k')) ||
                           (!isKingside && !isKingSide && move.flags?.includes('q'));
                  });
                  
                  if (castleMove) {
                    playSound('castle');
                    onMove(kingSquare, castleMove.to);
                    if (externalSelectedSquare === undefined) {
                      setInternalSelectedSquare(null);
                    }
                    return;
                  }
                }
              }
            } catch (error) {
              // If castling check fails, fall through to normal selection
            }
          }
        }
        
        // Normal piece selection
        if (externalSelectedSquare === undefined) {
          setInternalSelectedSquare(square);
        }
      }
    }
  }, [readOnly, onMove, selectedSquare, rankFileToSquare, boardState, effectiveLegalMoves, externalSelectedSquare, rookCastle, currentPlayerColor, chess, playSound, isClickEnabled, eraseArrowsOnClick, arrows, onArrowsChange]);

  // Get piece image path - supports custom piece sets
  const getPieceImage = useCallback((piece: Piece): string => {
    const pieceCode = `${piece.color === 'white' ? 'w' : 'b'}${piece.type.toUpperCase()}`;
    const pieceSetPath = pieceSet?.path || 'cburnett';
    // If pieceSetPath already starts with '/', it's a full path - use it directly
    // Otherwise, combine with piecesBaseUrl
    if (pieceSetPath.startsWith('/')) {
      return `${pieceSetPath}/${pieceCode}.svg`;
    }
    return `${piecesBaseUrl}/${pieceSetPath}/${pieceCode}.svg`;
  }, [pieceSet, piecesBaseUrl]);

  const squareSize = internalWidth / 8;

  // Determine if it's the player's turn (for premove validation)
  const isPlayerTurn = useMemo(() => {
    if (!currentPlayerColor) return true; // Default to allowing moves if not specified
    try {
      return chess.turn() === (currentPlayerColor === 'white' ? 'w' : 'b');
    } catch {
      return true;
    }
  }, [chess, currentPlayerColor]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, rank: number, file: number) => {
    if (readOnly) {
      e.preventDefault();
      return;
    }

    const square = rankFileToSquare(rank, file);
    const piece = boardState[rank]?.[file];
    
    if (!piece) {
      e.preventDefault();
      return;
    }

    // Check if it's the player's piece
    if (currentPlayerColor) {
      const pieceColor = piece.color === 'white' ? 'white' : 'black';
      if (pieceColor !== currentPlayerColor) {
        // Allow dragging opponent's piece only if premove is enabled and not player's turn
        if (!enablePremove || isPlayerTurn) {
          e.preventDefault();
          return;
        }
      }
    }

    setDraggedPiece({ square, piece });
    if (externalSelectedSquare === undefined) {
      setInternalSelectedSquare(square);
    }

    // Set initial ghost piece position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (boardRect) {
      setGhostPiecePosition({
        x: e.clientX - boardRect.left - squareSize / 2,
        y: e.clientY - boardRect.top - squareSize / 2,
      });
    }

    // Create invisible drag image for smooth dragging
    const canvas = document.createElement('canvas');
    canvas.width = squareSize;
    canvas.height = squareSize;
    e.dataTransfer.setDragImage(canvas, squareSize / 2, squareSize / 2);
    e.dataTransfer.effectAllowed = 'move';
  }, [readOnly, isDragEnabled, rankFileToSquare, boardState, currentPlayerColor, enablePremove, isPlayerTurn, externalSelectedSquare, squareSize]);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, rank: number, file: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const square = rankFileToSquare(rank, file);
    setDragOverSquare(square);
    
    // Update ghost piece position to follow cursor
    if (boardRef.current && draggedPiece) {
      const boardRect = boardRef.current.getBoundingClientRect();
      setGhostPiecePosition({
        x: e.clientX - boardRect.left - squareSize / 2,
        y: e.clientY - boardRect.top - squareSize / 2,
      });
    }
  }, [rankFileToSquare, draggedPiece, squareSize]);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, rank: number, file: number) => {
    e.preventDefault();
    if (!draggedPiece) return;

    const targetSquare = rankFileToSquare(rank, file);
    
    // Check for pawn promotion
    const targetPiece = boardState[rank]?.[file];
    const sourcePiece = chess.get(draggedPiece.square as any);
    const isPawn = sourcePiece?.type === 'p';
    const targetRank = targetSquare[1];
    const isPromotion = isPawn && (
      (sourcePiece?.color === 'w' && targetRank === '8') ||
      (sourcePiece?.color === 'b' && targetRank === '1')
    );

    // Check if move is legal
    try {
      const moves = chess.moves({ square: draggedPiece.square as any, verbose: true });
      const isValid = moves.some((move: any) => move.to === targetSquare);
      
      if (!isValid && !enablePremove) {
        setDraggedPiece(null);
        setDragOverSquare(null);
        return;
      }

      // Handle promotion
      if (isPromotion && onPromotionSelect) {
        setPendingPromotion({ from: draggedPiece.square, to: targetSquare });
        setShowPromotionDialog(true);
        setDraggedPiece(null);
        setDragOverSquare(null);
        return;
      }

                // Make the move
                if (isValid || enablePremove) {
                  const promotionPiece = isPromotion ? 'q' : undefined; // Default to queen if no callback
                  if (onMove) {
                    if (enablePremove && !isPlayerTurn) {
                      // Store as premove
                      setPremoves(prev => [...prev, { from: draggedPiece.square, to: targetSquare }]);
                    } else {
                      // Determine move type for sound
                      let isCastle = false;
                      if (sourcePiece?.type === 'k') {
                        const fileDiff = Math.abs(targetSquare.charCodeAt(0) - draggedPiece.square.charCodeAt(0));
                        if (fileDiff === 2) {
                          isCastle = true;
                        }
                      }
                      
                      // Check if move puts opponent in check
                      try {
                        const testChess = new Chess(chess.fen());
                        const move = testChess.move({ from: draggedPiece.square as any, to: targetSquare });
                        if (move) {
                          const isCheck = testChess.inCheck();
                          
                          // Play appropriate sound
                          if (isCastle) {
                            playSound('castle');
                          } else if (isPromotion) {
                            playSound('promotion');
                          } else if (isCheck) {
                            playSound('check');
                          } else if (targetPiece) {
                            playSound('capture');
                          } else {
                            playSound('move');
                          }
                        }
                      } catch (error) {
                        // Move might be invalid, but still try to play move sound
                        playSound('move');
                      }
                      
                      onMove(draggedPiece.square, targetSquare, promotionPiece as PieceType);
                    }
                  }
                }
    } catch (error) {
      console.error('[Chess960Board] Error validating move:', error);
    }

    setDraggedPiece(null);
    setDragOverSquare(null);
    if (externalSelectedSquare === undefined) {
      setInternalSelectedSquare(null);
    }
  }, [draggedPiece, rankFileToSquare, boardState, chess, enablePremove, isPlayerTurn, onMove, onPromotionSelect, externalSelectedSquare, playSound]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedPiece(null);
    setDragOverSquare(null);
    setGhostPiecePosition(null);
  }, []);

  // Track mouse movement during drag for ghost piece
  useEffect(() => {
    if (!draggedPiece) {
      setGhostPiecePosition(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (boardRef.current && draggedPiece) {
        const boardRect = boardRef.current.getBoundingClientRect();
        setGhostPiecePosition({
          x: e.clientX - boardRect.left - squareSize / 2,
          y: e.clientY - boardRect.top - squareSize / 2,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [draggedPiece, squareSize]);

  // Calculate valid moves for arrow start square (for snapping)
  const arrowValidMoves = useMemo(() => {
    if (!arrowStart || !snapToValidMoves || readOnly) return new Set<Square>();
    try {
      const moves = chess.moves({ square: arrowStart as any, verbose: true });
      return new Set(moves.map((move: any) => move.to));
    } catch {
      return new Set<Square>();
    }
  }, [arrowStart, snapToValidMoves, chess, readOnly]);

  // Handle right click - for square highlighting and arrow start
  const handleContextMenu = useCallback((e: React.MouseEvent, rank: number, file: number) => {
    e.preventDefault();
    if (readOnly) return;

    const square = rankFileToSquare(rank, file);
    
    // Cancel premoves on right click
    if (premoves.length > 0) {
      setPremoves([]);
      return;
    }

    // Toggle square highlight or start arrow
    if (onArrowsChange) {
      // Start arrow drawing
      if (!arrowStart) {
        setArrowStart(square);
        setIsDrawingArrow(true);
        // Initialize dragOverSquare to the start square for immediate feedback
        setDragOverSquare(square);
      } else {
        // Complete arrow - use snapped square if available
        const endSquare = snapToValidMoves && dragOverSquare && arrowValidMoves.has(dragOverSquare)
          ? dragOverSquare
          : square;
        
        if (arrowStart !== endSquare) {
          const newArrow = {
            startSquare: arrowStart,
            endSquare: endSquare,
            color: 'rgba(255, 170, 0, 0.5)',
          };
          const updatedArrows = [...arrows, newArrow];
          onArrowsChange(updatedArrows);
        }
        setArrowStart(null);
        setIsDrawingArrow(false);
        setDragOverSquare(null);
      }
    } else {
      // Simple square highlighting
      setRightClickedSquares(prev => {
        const color = 'rgba(0, 0, 255, 0.4)';
        const isHighlighted = prev[square]?.backgroundColor === color;
        if (isHighlighted) {
          const { [square]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [square]: { backgroundColor: color } };
      });
    }
  }, [readOnly, rankFileToSquare, premoves, onArrowsChange, arrowStart, arrows, snapToValidMoves, dragOverSquare, arrowValidMoves]);

  // Handle mouse enter for arrow drawing with snapping
  const handleMouseEnter = useCallback((rank: number, file: number) => {
    if (isDrawingArrow && arrowStart) {
      const square = rankFileToSquare(rank, file);
      
      // If snapping is enabled and this square is a valid move, snap to it
      if (snapToValidMoves && arrowValidMoves.has(square)) {
        setDragOverSquare(square);
      } else if (!snapToValidMoves) {
        // Without snapping, follow mouse normally
        setDragOverSquare(square);
      }
    }
  }, [isDrawingArrow, arrowStart, rankFileToSquare, snapToValidMoves, arrowValidMoves]);

  // Handle mouse move for arrow drawing with snapping (for better mouse tracking)
  const handleMouseMove = useCallback((e: React.MouseEvent, rank: number, file: number) => {
    if (isDrawingArrow && arrowStart && snapToValidMoves) {
      const square = rankFileToSquare(rank, file);
      
      // If this square is a valid move, snap to it
      if (arrowValidMoves.has(square)) {
        setDragOverSquare(square);
      } else {
        // Find nearest valid move square
        const currentSquare = rankFileToSquare(rank, file);
        const nearestValid = findNearestValidSquare(currentSquare, arrowValidMoves);
        if (nearestValid) {
          setDragOverSquare(nearestValid);
        }
      }
    }
  }, [isDrawingArrow, arrowStart, snapToValidMoves, arrowValidMoves, rankFileToSquare]);

  // Helper to find nearest valid square for snapping
  const findNearestValidSquare = useCallback((targetSquare: Square, validMoves: Set<Square>): Square | null => {
    if (validMoves.size === 0) return null;
    
    const targetCoords = squareToRankFile(targetSquare);
    let nearest: Square | null = null;
    let minDistance = Infinity;
    
    for (const validSquare of validMoves) {
      const validCoords = squareToRankFile(validSquare);
      const distance = Math.sqrt(
        Math.pow(validCoords.rank - targetCoords.rank, 2) + 
        Math.pow(validCoords.file - targetCoords.file, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = validSquare;
      }
    }
    
    // Only snap if within reasonable distance (2 squares)
    return minDistance <= 2 ? nearest : null;
  }, [squareToRankFile]);

  // Touch ignore radius helper
  const shouldIgnoreTouch = useCallback((e: React.TouchEvent, rank: number, file: number): boolean => {
    if (touchIgnoreRadius === 0) return false;
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Calculate distance from square center
    const centerX = squareSize / 2;
    const centerY = squareSize / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    const ignoreRadiusPx = touchIgnoreRadius * squareSize;
    
    return distance > ignoreRadiusPx;
  }, [touchIgnoreRadius, squareSize]);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent, rank: number, file: number) => {
    if (readOnly || !onMove) return;
    if (shouldIgnoreTouch(e, rank, file)) return;
    
    e.preventDefault();
    handleSquareClick(rank, file, e);
  }, [readOnly, onMove, shouldIgnoreTouch, handleSquareClick]);

  // Keyboard move input handler
  const parseKeyboardMove = useCallback((input: string): { from: Square; to: Square } | null => {
    input = input.trim().toLowerCase();
    
    // UCI format: e2e4
    if (/^[a-h][1-8][a-h][1-8]$/.test(input)) {
      return {
        from: input.substring(0, 2) as Square,
        to: input.substring(2, 4) as Square,
      };
    }
    
    // SAN format: Nf3, e4, O-O, etc. (simplified)
    try {
      // Castling
      if (input === 'o-o' || input === '0-0') {
        const turn = chess.turn();
        const rank = turn === 'w' ? 7 : 0;
        const kingSquare = rankFileToSquare(rank, 4); // e-file
        const rookSquare = rankFileToSquare(rank, 7); // h-file
        return { from: kingSquare, to: rookSquare };
      }
      if (input === 'o-o-o' || input === '0-0-0') {
        const turn = chess.turn();
        const rank = turn === 'w' ? 7 : 0;
        const kingSquare = rankFileToSquare(rank, 4); // e-file
        const rookSquare = rankFileToSquare(rank, 0); // a-file
        return { from: kingSquare, to: rookSquare };
      }
      
      // Try to parse as SAN using chess.js
      const moves = chess.moves({ verbose: true });
      const move = moves.find((m: any) => m.san.toLowerCase() === input);
      if (move) {
        return { from: move.from as Square, to: move.to as Square };
      }
    } catch (error) {
      // Failed to parse
    }
    
    return null;
  }, [chess, rankFileToSquare]);

  // Keyboard event handler
  useEffect(() => {
    if (!enableKeyboard || readOnly) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture input if typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // Handle special keys
      if (e.key === 'Escape') {
        keyboardInputRef.current = '';
        setKeyboardInput('');
        if (externalSelectedSquare === undefined) {
          setInternalSelectedSquare(null);
        }
        return;
      }
      
      if (e.key === 'Backspace') {
        keyboardInputRef.current = keyboardInputRef.current.slice(0, -1);
        setKeyboardInput(keyboardInputRef.current);
        return;
      }
      
      if (e.key === 'Enter') {
        const move = parseKeyboardMove(keyboardInputRef.current);
        if (move && onMove) {
          onMove(move.from, move.to);
          keyboardInputRef.current = '';
          setKeyboardInput('');
        }
        return;
      }
      
      // Handle alphanumeric input
      if (/^[a-h0-8o-]$/i.test(e.key)) {
        keyboardInputRef.current += e.key.toLowerCase();
        setKeyboardInput(keyboardInputRef.current);
        
        // Auto-submit if input matches UCI format
        if (keyboardInputRef.current.length === 4 && /^[a-h][1-8][a-h][1-8]$/.test(keyboardInputRef.current)) {
          const move = parseKeyboardMove(keyboardInputRef.current);
          if (move && onMove) {
            onMove(move.from, move.to);
            keyboardInputRef.current = '';
            setKeyboardInput('');
          }
        }
        
        // Call custom keyboard input handler if provided
        if (onKeyboardInput) {
          onKeyboardInput(keyboardInputRef.current);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboard, readOnly, onMove, parseKeyboardMove, onKeyboardInput, externalSelectedSquare]);

  // Clear arrow drawing on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setArrowStart(null);
        setIsDrawingArrow(false);
        setRightClickedSquares({});
        if (onArrowsChange) {
          onArrowsChange([]);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onArrowsChange]);

  // Resize handle handlers
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: internalWidth,
    };
  }, [internalWidth]);

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeStartRef.current) return;
    
    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;
    // Use diagonal distance for resizing
    const distance = (deltaX - deltaY) / 2;
    
    // Calculate new width (1 pixel = 0.5px board width)
    const widthDelta = distance * 0.5;
    const minWidth = 200;
    const maxWidth = 800;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.width + widthDelta));
    
    setInternalWidth(newWidth);
    if (onResize) {
      onResize(newWidth);
    }
  }, [isResizing, onResize]);

  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
    resizeStartRef.current = null;
  }, []);

  // Set up global mouse event listeners during resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
      document.body.style.cursor = 'nwse-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  // Helper to draw arrow SVG between two squares
  const getArrowPath = useCallback((start: Square, end: Square): string | null => {
    const startCoords = squareToRankFile(start);
    const endCoords = squareToRankFile(end);
    
    // Convert to display coordinates
    const startDisplayRank = orientation === 'white' ? startCoords.rank : 7 - startCoords.rank;
    const startDisplayFile = orientation === 'white' ? startCoords.file : 7 - startCoords.file;
    const endDisplayRank = orientation === 'white' ? endCoords.rank : 7 - endCoords.rank;
    const endDisplayFile = orientation === 'white' ? endCoords.file : 7 - endCoords.file;
    
    const startX = startDisplayFile * squareSize + squareSize / 2;
    const startY = startDisplayRank * squareSize + squareSize / 2;
    const endX = endDisplayFile * squareSize + squareSize / 2;
    const endY = endDisplayRank * squareSize + squareSize / 2;
    
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);
    const arrowLength = Math.sqrt(dx * dx + dy * dy);
    const arrowHeadSize = squareSize * 0.15;
    
    // Arrow shaft
    const shaftEndX = endX - Math.cos(angle) * arrowHeadSize;
    const shaftEndY = endY - Math.sin(angle) * arrowHeadSize;
    
    // Arrow head
    const arrowHeadAngle = Math.PI / 6;
    const headX1 = endX - Math.cos(angle - arrowHeadAngle) * arrowHeadSize;
    const headY1 = endY - Math.sin(angle - arrowHeadAngle) * arrowHeadSize;
    const headX2 = endX - Math.cos(angle + arrowHeadAngle) * arrowHeadSize;
    const headY2 = endY - Math.sin(angle + arrowHeadAngle) * arrowHeadSize;
    
    return `M ${startX} ${startY} L ${shaftEndX} ${shaftEndY} M ${endX} ${endY} L ${headX1} ${headY1} M ${endX} ${endY} L ${headX2} ${headY2}`;
  }, [orientation, squareSize, squareToRankFile]);

  return (
    <div 
      ref={boardRef}
      className="relative inline-block"
      style={{ width: internalWidth, height: internalWidth }}
    >
      {/* Board squares */}
      <div className="relative w-full h-full">
        {/* Render display positions (screen coordinates) */}
        {Array.from({ length: 8 }, (_, displayRank) =>
          Array.from({ length: 8 }, (_, displayFile) => {
            // Convert display coordinates to actual board coordinates
            // boardState[0] = rank 8 (black), boardState[7] = rank 1 (white)
            // For white orientation: displayRank 0 (top) = boardState[0] (rank 8/black)
            //                      displayRank 7 (bottom) = boardState[7] (rank 1/white)
            const actualRank = orientation === 'white' 
              ? displayRank  // displayRank 0->7 maps to boardState 0->7 (rank 8->1)
              : 7 - displayRank; // flipped for black orientation
            
            const actualFile = orientation === 'white'
              ? displayFile
              : 7 - displayFile;
            
            const squareColor = getSquareColor(actualRank, actualFile);
            const piece = boardState[actualRank]?.[actualFile];
            const square = rankFileToSquare(actualRank, actualFile);
            const isSelected = selectedSquare === square;
            const isLastMoveFrom = lastMove && lastMove[0] === square;
            const isLastMoveTo = lastMove && lastMove[1] === square;
            const isLegalMove = effectiveLegalMoves.includes(square);
            const isInCheckSquare = checkSquare === square;
            const isDragOver = dragOverSquare === square;
            const isRightClicked = rightClickedSquares[square];
            const isDragged = draggedPiece?.square === square; // Piece being dragged is temporarily hidden
            
            // Determine square background color with priority
            let squareBgColor = squareColor === 'dark' ? theme.dark : theme.light;
            if (isRightClicked) {
              squareBgColor = isRightClicked.backgroundColor;
            } else if (isDragOver) {
              squareBgColor = 'rgba(255, 255, 0, 0.6)'; // Bright yellow for drag over
            } else if (isLastMoveFrom || isLastMoveTo) {
              squareBgColor = 'rgba(255, 255, 0, 0.4)'; // Yellow for last move
            } else if (isSelected) {
              squareBgColor = 'rgba(255, 165, 0, 0.5)'; // Orange for selected
            } else if (showDestinations && isLegalMove) {
              // Highlight destination squares more subtly when showing destinations
              // The dot/ring indicators provide the main visual feedback
              squareBgColor = piece 
                ? squareBgColor // Keep original color for captures, ring provides the indicator
                : squareBgColor; // Keep original color for moves, dot provides the indicator
            }

            return (
              <div
                key={`${displayRank}-${displayFile}`}
                className="absolute transition-colors duration-150"
                style={{
                  left: `${displayFile * squareSize}px`,
                  top: `${displayRank * squareSize}px`,
                  width: squareSize,
                  height: squareSize,
                  backgroundColor: squareBgColor,
                  border: isSelected ? '2px solid #f59e0b' : isInCheckSquare ? '3px solid #ff0000' : 'none',
                  cursor: readOnly ? 'default' : piece && isDragEnabled ? 'grab' : (isClickEnabled && (piece || isLegalMove) ? 'pointer' : 'default'),
                }}
                onClick={() => handleSquareClick(actualRank, actualFile)}
                onTouchStart={(e) => handleTouchStart(e, actualRank, actualFile)}
                onContextMenu={(e) => handleContextMenu(e, actualRank, actualFile)}
                onDragOver={(e) => handleDragOver(e, actualRank, actualFile)}
                onDragLeave={() => setDragOverSquare(null)}
                onDrop={(e) => handleDrop(e, actualRank, actualFile)}
                onMouseEnter={(e) => {
                  handleMouseEnter(actualRank, actualFile);
                  if (isDrawingArrow) {
                    handleMouseMove(e, actualRank, actualFile);
                  }
                }}
                onMouseMove={(e) => {
                  if (isDrawingArrow) {
                    handleMouseMove(e, actualRank, actualFile);
                  }
                }}
                draggable={false}
              >
                {/* Legal move indicator (dot for empty squares) */}
                {showDestinations && isLegalMove && !piece && !isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div 
                      className="rounded-full transition-opacity duration-150"
                      style={{
                        width: squareSize * 0.4,
                        height: squareSize * 0.4,
                        backgroundColor: 'rgba(20, 85, 30, 0.5)',
                        boxShadow: '0 0 4px rgba(20, 85, 30, 0.6)',
                      }}
                    />
                  </div>
                )}
                
                {/* Capture indicator (ring around piece for captures) */}
                {showDestinations && isLegalMove && piece && (
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      border: '3px solid rgba(124, 252, 0, 0.8)',
                      borderRadius: '50%',
                      boxShadow: '0 0 8px rgba(124, 252, 0, 0.6), inset 0 0 8px rgba(124, 252, 0, 0.3)',
                    }}
                  />
                )}

                {/* Piece - hide if it's being animated from another square or in blindfold mode */}
                {piece && !isDragged && !blindfold && (() => {
                  const pieceKey = `${square}-${piece.color}-${piece.type}`;
                  const isAnimating = animatingPieces.has(pieceKey);
                  const isBeingDragged = draggedPiece?.square === square;
                  
                  // Don't show piece if it's currently animating from another square
                  if (isAnimating) {
                    return null;
                  }
                  
                  return (
                    <div
                                 className="w-full h-full flex items-center justify-center"
                                 draggable={!readOnly && isDragEnabled}
                      onDragStart={(e) => handleDragStart(e, actualRank, actualFile)}
                      onDragEnd={handleDragEnd}
                      style={{
                        cursor: readOnly ? 'default' : 'grab',
                      }}
                    >
                      <img
                        src={getPieceImage(piece)}
                        alt={`${piece.color} ${piece.type}`}
                        className="w-full h-full object-contain pointer-events-none select-none transition-all duration-150"
                        style={{
                          transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                          zIndex: isSelected ? 10 : 1,
                          opacity: isBeingDragged ? 0.3 : 1, // Make original piece semi-transparent when dragging
                        }}
                        draggable={false}
                      />
                    </div>
                  );
                })()}

                {/* Coordinates */}
                {showCoordinates && (
                  <>
                    {/* File labels (a-h) */}
                    {displayRank === 7 && (
                      <div
                        className="absolute bottom-0 right-1 text-[10px] font-bold pointer-events-none select-none"
                        style={{
                          color: squareColor === 'dark' ? '#d7d7d7' : '#4a4a4a',
                        }}
                      >
                        {'abcdefgh'[displayFile]}
                      </div>
                    )}
                    {/* Rank labels (1-8) */}
                    {displayFile === 0 && (
                      <div
                        className="absolute top-0 left-1 text-[10px] font-bold pointer-events-none select-none"
                        style={{
                          color: squareColor === 'dark' ? '#d7d7d7' : '#4a4a4a',
                        }}
                      >
                        {8 - displayRank}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
        
        {/* Arrow overlays */}
        {arrows.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width, height: width, zIndex: 5 }}
          >
            {arrows.map((arrow, idx) => {
              const path = getArrowPath(arrow.startSquare, arrow.endSquare);
              if (!path) return null;
              return (
                <path
                  key={idx}
                  d={path}
                  stroke={arrow.color || 'rgba(255, 170, 0, 0.5)'}
                  strokeWidth={squareSize * 0.08}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
          </svg>
        )}
        
        {/* Temporary arrow being drawn */}
        {arrowStart && dragOverSquare && arrowStart !== dragOverSquare && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width, height: width, zIndex: 6 }}
          >
            <path
              d={getArrowPath(arrowStart, dragOverSquare) || ''}
              stroke="rgba(255, 170, 0, 0.7)"
              strokeWidth={squareSize * 0.08}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        
        {/* Animated pieces layer */}
        {Array.from(animatingPieces.entries()).map(([key, anim]) => {
          const fromCoords = squareToRankFile(anim.from);
          const toCoords = squareToRankFile(anim.to);
          
          // Convert to display coordinates
          const fromDisplayRank = orientation === 'white' ? fromCoords.rank : 7 - fromCoords.rank;
          const fromDisplayFile = orientation === 'white' ? fromCoords.file : 7 - fromCoords.file;
          const toDisplayRank = orientation === 'white' ? toCoords.rank : 7 - toCoords.rank;
          const toDisplayFile = orientation === 'white' ? toCoords.file : 7 - toCoords.file;
          
          const fromX = fromDisplayFile * squareSize;
          const fromY = fromDisplayRank * squareSize;
          const toX = toDisplayFile * squareSize;
          const toY = toDisplayRank * squareSize;
          
          const dx = toX - fromX;
          const dy = toY - fromY;
          
          return (
            <AnimatedPiece
              key={key}
              fromX={fromX}
              fromY={fromY}
              dx={dx}
              dy={dy}
              piece={anim.piece}
              squareSize={squareSize}
              animationDuration={animationDuration}
              getPieceImage={getPieceImage}
            />
          );
        })}
        
        {/* Captured pieces (fade out) */}
        {Array.from(capturedPieces.entries()).map(([square, { piece }]) => {
          const coords = squareToRankFile(square);
          const displayRank = orientation === 'white' ? coords.rank : 7 - coords.rank;
          const displayFile = orientation === 'white' ? coords.file : 7 - coords.file;
          
          return (
            <div
              key={square}
              className="absolute pointer-events-none"
              style={{
                left: `${displayFile * squareSize}px`,
                top: `${displayRank * squareSize}px`,
                width: squareSize,
                height: squareSize,
                opacity: 0,
                transition: `opacity ${animationDuration}ms ease-out`,
                zIndex: 50,
              }}
            >
              <img
                src={getPieceImage(piece)}
                alt={`${piece.color} ${piece.type}`}
                className="w-full h-full object-contain select-none"
                draggable={false}
              />
            </div>
          );
        })}
        
        {/* Ghost piece during drag */}
        {draggedPiece && ghostPiecePosition && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${ghostPiecePosition.x}px`,
              top: `${ghostPiecePosition.y}px`,
              width: squareSize,
              height: squareSize,
              zIndex: 200,
              opacity: 0.7,
              transform: 'scale(1.1)',
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
            }}
          >
            <img
              src={getPieceImage(draggedPiece.piece)}
              alt={`${draggedPiece.piece.color} ${draggedPiece.piece.type}`}
              className="w-full h-full object-contain select-none"
              draggable={false}
            />
          </div>
        )}
        
        {/* Resize handle */}
        {enableResize && (
          <div
            className={`absolute -bottom-1 -right-1 w-6 h-6 cursor-nwse-resize z-50 ${
              isResizing ? 'opacity-100' : 'opacity-0 hover:opacity-100'
            } transition-opacity`}
            onMouseDown={handleResizeMouseDown}
            style={{
              background: 'linear-gradient(135deg, transparent 40%, rgba(249, 115, 22, 0.8) 40%, rgba(249, 115, 22, 0.8) 60%, transparent 60%)',
            }}
          >
            {/* Visual indicator lines */}
            <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none">
              <svg width="24" height="24" viewBox="0 0 24 24" className="opacity-80">
                <line x1="20" y1="4" x2="4" y2="20" stroke="rgba(249, 115, 22, 1)" strokeWidth="2" />
                <line x1="24" y1="8" x2="8" y2="24" stroke="rgba(249, 115, 22, 1)" strokeWidth="2" />
                <line x1="16" y1="0" x2="0" y2="16" stroke="rgba(249, 115, 22, 1)" strokeWidth="2" />
              </svg>
            </div>
          </div>
        )}
        
        {/* Scale indicator - shows current size percentage */}
        {enableResize && isResizing && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg pointer-events-none z-50">
            {Math.round((internalWidth / width) * 100)}%
          </div>
        )}
      </div>
    </div>
  );
}

