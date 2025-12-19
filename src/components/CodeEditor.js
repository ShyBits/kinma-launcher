import React, { useRef, useEffect, useState } from 'react';
import './CodeEditor.css';

// Code formatting functions
const formatHTML = (code) => {
  if (!code || !code.trim()) return code;
  
  let formatted = code.trim();
  let indent = 0;
  const indentSize = 2;
  const lines = formatted.split('\n');
  const formattedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      formattedLines.push('');
      continue;
    }
    
    // Decrease indent for closing tags
    if (line.match(/^<\/[^>]+>/)) {
      indent = Math.max(0, indent - indentSize);
    }
    
    // Add current line with proper indent
    formattedLines.push(' '.repeat(indent) + line);
    
    // Increase indent for opening tags (but not self-closing or void elements)
    if (line.match(/^<[^/!][^>]*>/) && !line.match(/\/>$/) && 
        !line.match(/<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)[\s>]/i)) {
      indent += indentSize;
    }
  }
  
  return formattedLines.join('\n');
};

const formatCSS = (code) => {
  if (!code || !code.trim()) return code;
  
  let formatted = code.trim();
  let indent = 0;
  const indentSize = 2;
  let result = '';
  let inComment = false;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < formatted.length; i++) {
    const char = formatted[i];
    const nextChar = formatted[i + 1];
    
    // Handle strings
    if ((char === '"' || char === "'") && !inComment) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && formatted[i - 1] !== '\\') {
        inString = false;
        stringChar = '';
      }
      result += char;
      continue;
    }
    
    // Handle comments
    if (char === '/' && nextChar === '*' && !inString) {
      inComment = true;
      result += char;
      continue;
    }
    if (char === '*' && nextChar === '/' && inComment) {
      inComment = true;
      result += char + nextChar;
      i++;
      inComment = false;
      continue;
    }
    if (inComment) {
      result += char;
      continue;
    }
    
    // Formatting logic
    if (char === '{') {
      result += ' {\n' + ' '.repeat(indent + indentSize);
      indent += indentSize;
    } else if (char === '}') {
      indent = Math.max(0, indent - indentSize);
      result += '\n' + ' '.repeat(indent) + '}';
    } else if (char === ';' && !inString) {
      result += ';\n' + ' '.repeat(indent);
    } else if (char === ':') {
      result += ': ';
    } else if (char === '\n' || char === '\r') {
      // Skip original newlines, we'll add our own
      continue;
    } else {
      result += char;
    }
  }
  
  // Clean up extra whitespace
  return result.split('\n')
    .map(line => line.trimRight())
    .filter((line, idx, arr) => {
      // Remove multiple empty lines
      if (!line.trim() && idx > 0 && !arr[idx - 1].trim()) return false;
      return true;
    })
    .join('\n');
};

const formatJavaScript = (code) => {
  if (!code || !code.trim()) return code;
  
  let formatted = code.trim();
  let indent = 0;
  const indentSize = 2;
  let result = '';
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inLineComment = false;
  
  for (let i = 0; i < formatted.length; i++) {
    const char = formatted[i];
    const nextChar = formatted[i + 1];
    const prevChar = formatted[i - 1];
    
    // Handle line comments
    if (char === '/' && nextChar === '/' && !inString && !inComment) {
      inLineComment = true;
      result += char;
      continue;
    }
    if (inLineComment && char === '\n') {
      inLineComment = false;
      result += '\n' + ' '.repeat(indent);
      continue;
    }
    if (inLineComment) {
      result += char;
      continue;
    }
    
    // Handle block comments
    if (char === '/' && nextChar === '*' && !inString) {
      inComment = true;
      result += char;
      continue;
    }
    if (char === '*' && nextChar === '/' && inComment) {
      inComment = false;
      result += char + nextChar;
      i++;
      continue;
    }
    if (inComment) {
      result += char;
      continue;
    }
    
    // Handle strings
    if ((char === '"' || char === "'" || char === '`') && !inComment) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = '';
      }
      result += char;
      continue;
    }
    
    if (inString) {
      result += char;
      continue;
    }
    
    // Formatting logic
    if (char === '{' || char === '[') {
      result += char + '\n' + ' '.repeat(indent + indentSize);
      indent += indentSize;
    } else if (char === '}' || char === ']') {
      indent = Math.max(0, indent - indentSize);
      result += '\n' + ' '.repeat(indent) + char;
    } else if (char === ';') {
      result += ';\n' + ' '.repeat(indent);
    } else if (char === ',') {
      result += ',\n' + ' '.repeat(indent);
    } else if (char === '\n' || char === '\r') {
      // Skip, we'll add our own
      continue;
    } else {
      result += char;
    }
  }
  
  // Clean up
  return result.split('\n')
    .map(line => line.trimRight())
    .filter((line, idx, arr) => {
      if (!line.trim() && idx > 0 && !arr[idx - 1].trim()) return false;
      return true;
    })
    .join('\n');
};

const CodeEditor = ({ value, onChange, language, placeholder, searchQuery = '', readOnly = false }) => {
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const contentRef = useRef(null);
  const [lineCount, setLineCount] = useState(1);
  const [lineNumbersStyle, setLineNumbersStyle] = useState({});
  const [isHoveringScrollbar, setIsHoveringScrollbar] = useState(false);
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);

  // Helper function to ensure value is always a string
  const getValueString = () => {
    return typeof value === 'string' ? value : String(value || '');
  };

  // Update line numbers when value changes
  useEffect(() => {
    const valueString = getValueString();
    const lines = valueString ? valueString.split('\n').length : 1;
    setLineCount(lines);
  }, [value]);

  // Update line numbers position based on textarea scroll (single scroll view)
  const handleTextareaScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      // Move line numbers content to match textarea scroll position exactly
      const scrollTop = textareaRef.current.scrollTop;
      setLineNumbersStyle(prev => ({
        ...prev,
        transform: `translateY(-${scrollTop}px)`
      }));
    }
  };
  
  // Sync line numbers height with textarea scroll height
  useEffect(() => {
    const syncLineNumbersHeight = () => {
      if (textareaRef.current && lineNumbersRef.current) {
        // Get computed styles for exact matching
        const textareaStyle = window.getComputedStyle(textareaRef.current);
        const textareaPaddingTop = parseFloat(textareaStyle.paddingTop) || 20;
        const textareaPaddingBottom = parseFloat(textareaStyle.paddingBottom) || 20;
        const textareaLineHeight = parseFloat(textareaStyle.lineHeight) || 22.4;
        const textareaScrollHeight = textareaRef.current.scrollHeight;
        
        // Match line numbers exactly
        const lineHeight = textareaLineHeight;
        const paddingTop = textareaPaddingTop;
        const basePaddingBottom = textareaPaddingBottom;
        
        // Calculate expected height for line numbers content (just the lines)
        const expectedLineNumbersContentHeight = lineCount * lineHeight;
        // Total height including padding - must match textarea exactly
        const expectedLineNumbersTotalHeight = expectedLineNumbersContentHeight + paddingTop + basePaddingBottom;
        
        // Calculate the difference and adjust padding-bottom to match textarea scroll height
        const heightDifference = textareaScrollHeight - expectedLineNumbersTotalHeight;
        
        // Get current scroll position
        const scrollTop = textareaRef.current.scrollTop;
        
        setLineNumbersStyle(prev => {
          const newStyle = { ...prev };
          
          // Ensure padding-top matches textarea exactly
          newStyle.paddingTop = `${paddingTop}px`;
          newStyle.paddingLeft = '16px';
          newStyle.paddingRight = '12px';
          
          // Update padding-bottom to match scroll height exactly
          if (Math.abs(heightDifference) > 0.5) {
            const adjustedPaddingBottom = basePaddingBottom + heightDifference;
            newStyle.paddingBottom = `${Math.max(basePaddingBottom, adjustedPaddingBottom)}px`;
          } else {
            newStyle.paddingBottom = `${basePaddingBottom}px`;
          }
          
          // Update transform to match scroll position exactly
          newStyle.transform = `translateY(-${scrollTop}px)`;
          
          return newStyle;
        });
      }
    };
    
    syncLineNumbersHeight();
    const timeout1 = setTimeout(syncLineNumbersHeight, 0);
    const timeout2 = setTimeout(syncLineNumbersHeight, 50);
    const timeout3 = setTimeout(syncLineNumbersHeight, 150);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [value, lineCount]);

  const formatCode = () => {
    const valueString = getValueString();
    if (readOnly || !valueString) return;
    
    let formatted = valueString;
    switch (language) {
      case 'html':
        formatted = formatHTML(valueString);
        break;
      case 'css':
        formatted = formatCSS(valueString);
        break;
      case 'javascript':
        formatted = formatJavaScript(valueString);
        break;
      default:
        return;
    }
    
    onChange({ target: { value: formatted } });
  };

  const handleKeyDown = (e) => {
    if (readOnly) return;
    
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Format on Ctrl+Shift+F or Cmd+Shift+F
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      formatCode();
      return;
    }
    
    // Tab handling
    if (e.key === 'Tab') {
      e.preventDefault();
      const valueString = getValueString();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (e.shiftKey) {
        // Shift+Tab: Remove indentation
        const lines = valueString.split('\n');
        const startLine = valueString.substring(0, start).split('\n').length - 1;
        const endLine = valueString.substring(0, end).split('\n').length - 1;
        
        let newValue = valueString;
        let removedChars = 0;
        
        for (let i = startLine; i <= endLine; i++) {
          if (lines[i] && (lines[i].startsWith('  ') || lines[i].startsWith('\t'))) {
            const indent = lines[i].startsWith('  ') ? 2 : 1;
            const lineStart = i === 0 ? 0 : valueString.split('\n').slice(0, i).join('\n').length + 1;
            newValue = newValue.substring(0, lineStart - removedChars) + 
                      newValue.substring(lineStart + indent - removedChars);
            removedChars += indent;
          }
        }
        
        onChange({ target: { value: newValue } });
        setTimeout(() => {
          const newStart = Math.max(0, start - (startLine === endLine ? Math.min(2, removedChars) : 0));
          textarea.selectionStart = textarea.selectionEnd = newStart;
        }, 0);
      } else {
        // Tab: Add indentation
        const newValue = valueString.substring(0, start) + '  ' + valueString.substring(end);
        onChange({ target: { value: newValue } });
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
    
    // Auto-indent on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const valueString = getValueString();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const textBefore = valueString.substring(0, start);
      const textAfter = valueString.substring(end);
      const lines = textBefore.split('\n');
      const currentLine = lines[lines.length - 1];
      const indentMatch = currentLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      
      // Check if we should add extra indent (after {, [, etc.)
      const shouldIndent = /[{\[\(]$/.test(currentLine.trim());
      const newIndent = shouldIndent ? indent + '  ' : indent;
      
      const newValue = valueString.substring(0, start) + '\n' + newIndent + textAfter;
      onChange({ target: { value: newValue } });
      
      setTimeout(() => {
        const newStart = start + newIndent.length + 1;
        textarea.selectionStart = textarea.selectionEnd = newStart;
      }, 0);
    }
  };

  const handlePaste = (e) => {
    if (readOnly) return;
    
    e.preventDefault();
    const pastedValue = e.clipboardData.getData('text');
    
    if (!pastedValue) return;
    
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const valueString = getValueString();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = valueString.substring(0, start) + pastedValue + valueString.substring(end);
    
    // Update the value first
    onChange({ target: { value: newValue } });
    
    // Set cursor position
    setTimeout(() => {
      const newCursorPos = start + pastedValue.length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      
      // Auto-format if it's substantial code
      if (pastedValue.length > 50) {
        setTimeout(() => {
          formatCode();
        }, 100);
      }
    }, 0);
  };

  // Sync line numbers container height with textarea scroll height
  useEffect(() => {
    const syncLineNumbersHeight = () => {
      if (textareaRef.current && lineNumbersRef.current) {
        const textareaScrollHeight = textareaRef.current.scrollHeight;
        const lineHeight = 22.4; // 14px * 1.6
        const paddingTop = 20;
        const paddingBottom = 20;
        const calculatedHeight = (lineCount * lineHeight) + paddingTop + paddingBottom;
        
        // If textarea has more scroll height, add padding-bottom to line numbers to match
        if (textareaScrollHeight > calculatedHeight) {
          const difference = textareaScrollHeight - calculatedHeight;
          setLineNumbersStyle({
            paddingBottom: `${paddingBottom + difference}px`
          });
        } else {
          setLineNumbersStyle({
            paddingBottom: `${paddingBottom}px`
          });
        }
        
        // Sync scroll position
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
    };
    
    syncLineNumbersHeight();
    const timeout = setTimeout(syncLineNumbersHeight, 100);
    
    return () => clearTimeout(timeout);
  }, [value, lineCount]);

  return (
    <div className={`code-editor-wrapper code-editor-wrapper-${language}`}>
      <div 
        className="code-editor-line-numbers" 
        ref={lineNumbersRef}
      >
        <div 
          className="code-editor-line-numbers-content"
          style={lineNumbersStyle}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="code-editor-line-number">
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      <div 
        className="code-editor-content"
        ref={contentRef}
        onMouseMove={(e) => {
          if (textareaRef.current && !isDraggingScrollbar) {
            const textarea = textareaRef.current;
            const rect = textarea.getBoundingClientRect();
            const scrollbarWidth = 8;
            const scrollbarHeight = 8;
            
            // Check if mouse is near vertical scrollbar
            const isNearVerticalScrollbar = e.clientX >= rect.right - scrollbarWidth - 2 && 
                                           e.clientX <= rect.right + 2;
            
            // Check if mouse is near horizontal scrollbar
            const isNearHorizontalScrollbar = e.clientY >= rect.bottom - scrollbarHeight - 2 && 
                                             e.clientY <= rect.bottom + 2;
            
            // Check if mouse is in scrollbar corner area
            const isInCorner = isNearVerticalScrollbar && isNearHorizontalScrollbar;
            
            setIsHoveringScrollbar(isNearVerticalScrollbar || isNearHorizontalScrollbar);
            
            // Update cursor style
            if (isInCorner) {
              textarea.style.cursor = 'default';
            } else if (isNearVerticalScrollbar || isNearHorizontalScrollbar) {
              textarea.style.cursor = isDraggingScrollbar ? 'grabbing' : 'grab';
            } else {
              textarea.style.cursor = 'text';
            }
          }
        }}
        onMouseLeave={() => {
          setIsHoveringScrollbar(false);
          setIsDraggingScrollbar(false);
          if (textareaRef.current) {
            textareaRef.current.style.cursor = 'text';
          }
        }}
        onMouseDown={(e) => {
          if (isHoveringScrollbar) {
            setIsDraggingScrollbar(true);
            if (textareaRef.current) {
              textareaRef.current.style.cursor = 'grabbing';
            }
          }
        }}
        onMouseUp={() => {
          setIsDraggingScrollbar(false);
          if (textareaRef.current && !isHoveringScrollbar) {
            textareaRef.current.style.cursor = 'text';
          } else if (textareaRef.current && isHoveringScrollbar) {
            textareaRef.current.style.cursor = 'grab';
          }
        }}
      >
        <textarea
          ref={textareaRef}
          className={`code-editor-textarea code-editor-${language}`}
          value={getValueString()}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onScroll={handleTextareaScroll}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          readOnly={readOnly}
          style={{ cursor: 'text' }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
