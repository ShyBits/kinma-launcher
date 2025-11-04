import React, { useRef, useEffect, useState } from 'react';
import './CodeEditor.css';

// Check for CSS errors (unclosed braces, brackets, missing semicolons, etc.)
const findCSSErrors = (code) => {
  const errors = new Set();
  const braceStack = [];
  const bracketStack = [];
  let inString = false;
  let stringChar = null;
  let inComment = false;
  
  // Track property declarations for missing semicolon detection
  const lines = code.split('\n');
  let inRule = false;
  let lastPropertyEnd = -1;
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const prevChar = i > 0 ? code[i - 1] : '';
    const nextChar = i < code.length - 1 ? code[i + 1] : '';
    
    // Handle comments
    if (!inString && char === '/' && nextChar === '*') {
      inComment = true;
      i++;
      continue;
    }
    if (inComment && char === '*' && nextChar === '/') {
      inComment = false;
      i++;
      continue;
    }
    if (inComment) continue;
    
    // Handle strings
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      continue;
    }
    if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      stringChar = null;
      continue;
    }
    if (inString) continue;
    
    // Track when we're inside a rule (between { and })
    if (char === '{') {
      braceStack.push({ type: '{', index: i });
      inRule = true;
    } else if (char === '}') {
      if (braceStack.length === 0) {
        errors.add(i); // Closing brace without opening
      } else {
        braceStack.pop();
        inRule = false;
      }
      lastPropertyEnd = -1;
    }
    
    // Handle brackets
    if (char === '[') {
      bracketStack.push({ type: '[', index: i });
    } else if (char === ']') {
      if (bracketStack.length === 0) {
        errors.add(i); // Closing bracket without opening
      } else {
        bracketStack.pop();
      }
    }
    
    // Check for missing semicolons in CSS properties
    if (inRule && braceStack.length > 0) {
      // Look for property: value patterns
      const propertyPattern = /([a-zA-Z-]+)\s*:\s*([^;{}]+)/g;
      let match;
      let lastIndex = 0;
      
      // Find all property declarations in the current rule
      const beforeBrace = code.lastIndexOf('{', i);
      if (beforeBrace !== -1) {
        const ruleContent = code.substring(beforeBrace + 1, i);
        const lastMatch = ruleContent.match(/([a-zA-Z-]+)\s*:\s*([^;{}]+)([^;])$/);
        if (lastMatch && lastMatch[3] !== ';') {
          // Check if this is really a property (not a value)
          const potentialProperty = lastMatch[1].trim();
          const potentialValue = lastMatch[2].trim();
          // Simple heuristic: if it looks like a property (has a colon before it)
          if (potentialProperty && potentialValue && !potentialProperty.includes('(') && !potentialProperty.includes('[')) {
            // Check if we're at the end of a line or before a closing brace
            const remaining = code.substring(i);
            const nextNonWhitespace = remaining.match(/^\s*([\n}])/);
            if (nextNonWhitespace && nextNonWhitespace[1] === '}') {
              // Missing semicolon before closing brace
              const colonIndex = code.lastIndexOf(':', i);
              if (colonIndex !== -1 && colonIndex > beforeBrace) {
                const afterColon = code.substring(colonIndex + 1, i).trim();
                if (afterColon && !afterColon.includes(';')) {
                  errors.add(colonIndex);
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Check for missing semicolons at end of properties
  const propertyRegex = /([a-zA-Z-]+)\s*:\s*([^;{}\n]+)/g;
  let match;
  while ((match = propertyRegex.exec(code)) !== null) {
    const propertyEnd = match.index + match[0].length;
    // Check if there's a semicolon, closing brace, or newline after
    const afterProperty = code.substring(propertyEnd, propertyEnd + 10);
    if (!afterProperty.match(/^\s*[;}\n]/)) {
      // Check if we're inside a rule
      const beforeMatch = code.substring(0, match.index);
      const lastOpenBrace = beforeMatch.lastIndexOf('{');
      const lastCloseBrace = beforeMatch.lastIndexOf('}');
      if (lastOpenBrace > lastCloseBrace) {
        // We're inside a rule
        const afterValue = code.substring(propertyEnd);
        const nextChar = afterValue.match(/^\s*([;}\n])/);
        if (nextChar && nextChar[1] === '}') {
          // Missing semicolon before closing brace
          errors.add(propertyEnd);
        }
      }
    }
  }
  
  // Mark unclosed opening braces/brackets as errors
  braceStack.forEach(unclosed => errors.add(unclosed.index));
  bracketStack.forEach(unclosed => errors.add(unclosed.index));
  
  return errors;
};

// Check for JavaScript errors (unclosed braces, brackets, parentheses, missing semicolons, etc.)
const findJSErrors = (code) => {
  const errors = new Set();
  const braceStack = [];
  const bracketStack = [];
  const parenStack = [];
  let inString = false;
  let stringChar = null;
  let inComment = false;
  let inBlockComment = false;
  
  // Track statement endings for semicolon detection
  const statementEndKeywords = ['return', 'break', 'continue', 'throw'];
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const prevChar = i > 0 ? code[i - 1] : '';
    const nextChar = i < code.length - 1 ? code[i + 1] : '';
    
    // Handle comments
    if (!inString && !inBlockComment && char === '/' && nextChar === '/') {
      // Line comment - skip to end of line
      const lineEnd = code.indexOf('\n', i);
      if (lineEnd !== -1) {
        i = lineEnd;
        continue;
      } else {
        break;
      }
    }
    if (!inString && char === '/' && nextChar === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (inBlockComment && char === '*' && nextChar === '/') {
      inBlockComment = false;
      i++;
      continue;
    }
    if (inBlockComment || inComment) continue;
    
    // Handle strings (single, double, template literals)
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
      continue;
    }
    if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      stringChar = null;
      continue;
    }
    if (inString) continue;
    
    // Handle braces
    if (char === '{') {
      braceStack.push({ type: '{', index: i });
    } else if (char === '}') {
      if (braceStack.length === 0) {
        errors.add(i);
      } else {
        braceStack.pop();
      }
    }
    
    // Handle brackets
    if (char === '[') {
      bracketStack.push({ type: '[', index: i });
    } else if (char === ']') {
      if (bracketStack.length === 0) {
        errors.add(i);
      } else {
        bracketStack.pop();
      }
    }
    
    // Handle parentheses
    if (char === '(') {
      parenStack.push({ type: '(', index: i });
    } else if (char === ')') {
      if (parenStack.length === 0) {
        errors.add(i);
      } else {
        parenStack.pop();
      }
    }
  }
  
  // Check for missing semicolons after statements
  // Look for patterns like: const x = 5 (missing semicolon)
  const statementPatterns = [
    // Variable declarations
    /\b(const|let|var)\s+\w+\s*=\s*[^;{}\n]+/g,
    // Return statements
    /\breturn\s+[^;{}\n]+/g,
    // Function calls that should have semicolons
    /\w+\s*\([^)]*\)\s*[^;{}\n]/g
  ];
  
  statementPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const matchEnd = match.index + match[0].length;
      // Check if there's a semicolon, closing brace, or newline after
      const afterMatch = code.substring(matchEnd);
      const nextNonWhitespace = afterMatch.match(/^\s*([;}\n{])/);
      
      // Check if we're inside a string or comment
      const beforeMatch = code.substring(0, match.index);
      const inString = /(["'`])(?:(?=(\\?))\2.)*?\1/.test(beforeMatch);
      const inComment = /\/\/.*$|\/\*[\s\S]*?\*\//.test(beforeMatch);
      
      if (!inString && !inComment) {
        // Check if this is a statement that needs a semicolon
        const statementText = match[0].trim();
        
        // Skip if it's already ending with a semicolon
        if (statementText.endsWith(';')) continue;
        
        // Skip if it's a function declaration
        if (/function\s+\w+\s*\(/.test(statementText)) continue;
        
        // Skip if it's a control structure (if, for, while, etc.)
        if (/^\s*(if|for|while|switch|try|catch|finally)\s*\(/.test(statementText)) continue;
        
        // Check if next non-whitespace is a closing brace or new statement
        if (nextNonWhitespace) {
          if (nextNonWhitespace[1] === '}') {
            // Missing semicolon before closing brace
            errors.add(matchEnd);
          } else if (nextNonWhitespace[1] === '\n') {
            // Check if next line starts a new statement
            const afterNewline = afterMatch.substring(afterMatch.indexOf('\n') + 1);
            const nextLineStart = afterNewline.match(/^\s*([a-zA-Z_$])/);
            if (nextLineStart && !afterNewline.match(/^\s*(if|for|while|switch|try|catch|finally|else|catch|finally)\s*\(/)) {
              // Missing semicolon - next line starts a new statement
              errors.add(matchEnd);
            }
          }
        }
      }
    }
  });
  
  // Mark unclosed as errors
  braceStack.forEach(unclosed => errors.add(unclosed.index));
  bracketStack.forEach(unclosed => errors.add(unclosed.index));
  parenStack.forEach(unclosed => errors.add(unclosed.index));
  
  return errors;
};

// Check for HTML tag errors (unclosed tags, mismatched tags)
const findHTMLErrors = (code) => {
  const errors = new Set(); // Set of tag indices that have errors
  const tagRegex = /<(\/?)([\w-]+)([^>]*?)(\/?)>/g;
  const tagStack = []; // Stack of opening tags
  const tagMatches = [];
  let match;
  
  // Collect all tags
  while ((match = tagRegex.exec(code)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2].toLowerCase();
    const isSelfClosing = match[4] === '/' || ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'].includes(tagName);
    const fullMatch = match[0];
    
    tagMatches.push({
      index: match.index,
      endIndex: match.index + fullMatch.length,
      isClosing,
      tagName,
      isSelfClosing,
      fullMatch
    });
  }
  
  // Process tags to find errors
  tagMatches.forEach((tagMatch, idx) => {
    if (tagMatch.isSelfClosing) {
      return; // Self-closing tags don't need to be matched
    }
    
    if (tagMatch.isClosing) {
      // Find matching opening tag
      let found = false;
      for (let i = tagStack.length - 1; i >= 0; i--) {
        if (tagStack[i].tagName === tagMatch.tagName) {
          tagStack.splice(i, 1);
          found = true;
          break;
        }
      }
      if (!found) {
        // Closing tag without matching opening tag
        errors.add(tagMatch.index);
      }
    } else {
      // Opening tag - add to stack
      tagStack.push({
        tagName: tagMatch.tagName,
        index: tagMatch.index
      });
    }
  });
  
  // Mark unclosed opening tags as errors
  tagStack.forEach(unclosed => {
    errors.add(unclosed.index);
  });
  
  return errors;
};

// Enhanced syntax highlighting for HTML, CSS, and JavaScript (VS Code style)
const highlightCode = (code, language) => {
  if (!code) return '';
  
  let result = code;
  
  // Find errors based on language
  const htmlErrors = language === 'html' ? findHTMLErrors(code) : new Set();
  const cssErrors = language === 'css' ? findCSSErrors(code) : new Set();
  const jsErrors = language === 'javascript' ? findJSErrors(code) : new Set();
  
  if (language === 'html') {
    // Process ALL HTML tags first, then escape remaining content
    // Use a more robust approach to find all tags
    const tagRegex = /<(\/?[\w-]+)([^>]*?)(\/?)>/g;
    const tagMatches = [];
    let match;
    
    // Collect all tag matches first
    while ((match = tagRegex.exec(result)) !== null) {
      tagMatches.push({
        index: match.index,
        fullMatch: match[0],
        tag: match[1],
        attrs: match[2] || '',
        selfClose: match[3] || ''
      });
    }
    
    // Process tags from end to start to avoid index shifting
    const parts = [];
    let lastIndex = result.length;
    
    for (let i = tagMatches.length - 1; i >= 0; i--) {
      const tagMatch = tagMatches[i];
      const { index, fullMatch, tag, attrs, selfClose } = tagMatch;
      
      // Add text after this tag (before the next tag)
      if (lastIndex > index + fullMatch.length) {
        const afterText = result.substring(index + fullMatch.length, lastIndex);
        parts.unshift(afterText);
      }
      
      // Process the tag itself
      // Check if this tag has an error
      const hasError = htmlErrors.has(index);
      const errorClass = hasError ? ' code-tag-error' : '';
      
      // Build the highlighted tag - tag name and delimiters get tag color
      // Equals signs get white (default color), quotes and values get string color
      // Escape the tag name first
      const escapedTagName = tag
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      let tagContent = '<span class="code-tag' + errorClass + '">&lt;' + escapedTagName;
      
      // Process attributes if present
      if (attrs && attrs.trim()) {
        // Process attributes: find attribute patterns like "name=value" or "name='value'"
        const attrString = attrs;
        let attrParts = [];
        
        // Find attribute patterns: attribute name, equals, and quoted value
        const attrPatternRegex = /(\w+)(\s*=\s*)(["'])([^"']*)\3/g;
        const attrMatches = [];
        let attrMatch;
        
        while ((attrMatch = attrPatternRegex.exec(attrString)) !== null) {
          attrMatches.push({
            index: attrMatch.index,
            endIndex: attrMatch.index + attrMatch[0].length,
            attrName: attrMatch[1],
            equalsAndSpaces: attrMatch[2],
            quote: attrMatch[3],
            value: attrMatch[4]
          });
        }
        
        // Process the attribute string, separating tag color, equals (white), and string color
        let currentIndex = 0;
        
        for (const attrMatch of attrMatches) {
          // Add everything before this attribute (tag color)
          if (attrMatch.index > currentIndex) {
            const beforeAttr = attrString.substring(currentIndex, attrMatch.index);
            const escapedBefore = beforeAttr
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            attrParts.push(escapedBefore);
          }
          
          // Add attribute name (tag color - already in tag span)
          const escapedAttrName = attrMatch.attrName
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          attrParts.push(escapedAttrName);
          
          // Close tag span, add equals sign (white - default color), then re-open tag span
          const escapedEquals = attrMatch.equalsAndSpaces
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          attrParts.push(`</span>${escapedEquals}<span class="code-tag${errorClass}">`);
          
          // Add quoted string (both quotes and value in string color)
          const escapedValue = attrMatch.value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          const escapedQuote = attrMatch.quote === '"' ? '&quot;' : attrMatch.quote;
          attrParts.push(`</span><span class="code-string">${escapedQuote}${escapedValue}${escapedQuote}</span><span class="code-tag${errorClass}">`);
          
          currentIndex = attrMatch.endIndex;
        }
        
        // Add remaining attribute text after last attribute (tag color)
        if (currentIndex < attrString.length) {
          const remaining = attrString.substring(currentIndex);
          const escapedRemaining = remaining
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          attrParts.push(escapedRemaining);
        }
        
        tagContent += attrParts.join('');
      }
      
      tagContent += selfClose ? `/${selfClose}&gt;` : `&gt;`;
      tagContent += '</span>';
      
      parts.unshift(tagContent);
      
      lastIndex = index;
    }
    
    // Add remaining text at the beginning
    if (lastIndex > 0) {
      const beforeText = result.substring(0, lastIndex);
      parts.unshift(beforeText);
    }
    
    // Now escape all content that's not in spans
    result = parts.map(part => {
      // Check if part is already a highlighted span
      if (part.startsWith('<span') && part.includes('class=')) {
        return part;
      }
      // Escape content outside spans
      return part
        .replace(/&(?!amp;|lt;|gt;|quot;)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }).join('');
    
    // HTML comments (after escaping)
    result = result.replace(/&lt;!--[\s\S]*?--&gt;/g, (match) => {
      if (match.includes('class=')) return match;
      return `<span class="code-comment">${match}</span>`;
    });
    
    // HTML strings (fallback) - handle remaining strings outside tags
    result = result.replace(/(&quot;)(?:(?=(\\?))\2.)*?\1/g, (match) => {
      if (match.includes('class=')) return match;
      return `<span class="code-string">${match}</span>`;
    });
  } else if (language === 'css') {
    // Process CSS similar to HTML - find all syntax elements first, then build result
    // First escape all HTML entities
    const escapedCode = result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    
    // Collect all syntax elements with their positions
    const elements = [];
    
    // Find CSS comments
    const commentRegex = /\/\*[\s\S]*?\*\//g;
    let match;
    while ((match = commentRegex.exec(escapedCode)) !== null) {
      elements.push({
        index: match.index,
        endIndex: match.index + match[0].length,
        type: 'comment',
        content: match[0]
      });
    }
    
    // Find CSS strings
    const stringRegex = /(&quot;)(?:(?=(\\?))\2.)*?\1/g;
    while ((match = stringRegex.exec(escapedCode)) !== null) {
      elements.push({
        index: match.index,
        endIndex: match.index + match[0].length,
        type: 'string',
        content: match[0]
      });
    }
    
    // Find CSS selectors (before {)
    const selectorRegex = /([^{}]+)(\{)/g;
    while ((match = selectorRegex.exec(escapedCode)) !== null) {
      const selectorIndex = match.index;
      const braceIndex = selectorIndex + match[1].length;
      const hasError = cssErrors.has(braceIndex);
      elements.push({
        index: selectorIndex,
        endIndex: selectorIndex + match[1].length,
        type: 'selector',
        content: match[1].trim(),
        hasError: false
      });
      elements.push({
        index: braceIndex,
        endIndex: braceIndex + 1,
        type: 'brace',
        content: '{',
        hasError: hasError
      });
    }
    
    // Find CSS properties and values together (property: value;)
    const propertyValueRegex = /(\s+)(\w+)(\s*:\s*)([^;{]+)(;)/g;
    while ((match = propertyValueRegex.exec(escapedCode)) !== null) {
      const whitespaceIndex = match.index;
      const propIndex = whitespaceIndex + match[1].length;
      const colonIndex = propIndex + match[2].length;
      const valueIndex = colonIndex + match[3].length;
      const valueEndIndex = valueIndex + match[4].trim().length;
      const semicolonIndex = match.index + match[0].length - 1;
      
      const hasError = cssErrors.has(propIndex + match[2].length) || cssErrors.has(colonIndex) || cssErrors.has(valueIndex);
      
      // Add whitespace before property
      if (match[1]) {
        elements.push({
          index: whitespaceIndex,
          endIndex: propIndex,
          type: 'whitespace',
          content: match[1]
        });
      }
      
      // Add property
      elements.push({
        index: propIndex,
        endIndex: colonIndex,
        type: 'property',
        content: match[2],
        hasError: hasError
      });
      
      // Add colon and spaces after property
      if (match[3]) {
        elements.push({
          index: colonIndex,
          endIndex: valueIndex,
          type: 'colon',
          content: match[3]
        });
      }
      
      // Add value
      if (match[4].trim()) {
        elements.push({
          index: valueIndex,
          endIndex: valueEndIndex,
          type: 'value',
          content: match[4].trim(),
          hasError: hasError
        });
      }
      
      // Add semicolon
      elements.push({
        index: semicolonIndex,
        endIndex: match.index + match[0].length,
        type: 'semicolon',
        content: match[5]
      });
    }
    
    // Find CSS values without semicolon (missing semicolon errors)
    const valueWithoutSemicolonRegex = /:([^;{]+)(\s*[}\n])/g;
    while ((match = valueWithoutSemicolonRegex.exec(escapedCode)) !== null) {
      // Check if this was already captured by propertyValueRegex
      const alreadyCaptured = elements.some(e => 
        e.index <= match.index && e.endIndex >= match.index + match[0].length
      );
      if (!alreadyCaptured) {
        const colonIndex = match.index;
        const valueIndex = colonIndex + 1;
        const valueEndIndex = valueIndex + match[1].trim().length;
        const hasError = cssErrors.has(colonIndex) || cssErrors.has(valueIndex);
        
        if (match[1].trim()) {
          elements.push({
            index: colonIndex,
            endIndex: valueIndex,
            type: 'colon',
            content: ':'
          });
          elements.push({
            index: valueIndex,
            endIndex: valueEndIndex,
            type: 'value',
            content: match[1].trim(),
            hasError: hasError
          });
        }
      }
    }
    
    // Find CSS numbers (but skip if already in a value or comment or string)
    const numberRegex = /\b(\d+\.?\d*)(px|em|rem|%|vh|vw|s|ms|deg|rad)?\b/g;
    while ((match = numberRegex.exec(escapedCode)) !== null) {
      // Check if this number is already captured by a value, comment, or string
      const alreadyCaptured = elements.some(e => 
        (e.type === 'value' || e.type === 'comment' || e.type === 'string') &&
        e.index <= match.index && e.endIndex >= match.index + match[0].length
      );
      if (!alreadyCaptured) {
        elements.push({
          index: match.index,
          endIndex: match.index + match[0].length,
          type: 'number',
          content: match[0]
        });
      }
    }
    
    // Find closing braces with errors (but skip if already captured)
    const closingBraceRegex = /\}/g;
    while ((match = closingBraceRegex.exec(escapedCode)) !== null) {
      const braceIndex = match.index;
      // Check if this brace was already captured by selector regex
      const alreadyCaptured = elements.some(e => 
        e.type === 'brace' && e.index === braceIndex
      );
      if (!alreadyCaptured) {
        const hasError = cssErrors.has(braceIndex);
        elements.push({
          index: braceIndex,
          endIndex: braceIndex + 1,
          type: 'brace',
          content: '}',
          hasError: hasError
        });
      }
    }
    
    // Sort elements by index
    elements.sort((a, b) => a.index - b.index);
    
    // Remove overlapping elements (keep the most specific/earliest one)
    const filteredElements = [];
    for (const current of elements) {
      let shouldAdd = true;
      
      for (let j = 0; j < filteredElements.length; j++) {
        const existing = filteredElements[j];
        // Check if current overlaps with existing
        const overlaps = (current.index < existing.endIndex && current.endIndex > existing.index);
        
        if (overlaps) {
          shouldAdd = false;
          // Priority: comment > string > other types
          const currentPriority = current.type === 'comment' ? 3 : (current.type === 'string' ? 2 : 1);
          const existingPriority = existing.type === 'comment' ? 3 : (existing.type === 'string' ? 2 : 1);
          
          // If current has higher priority or same priority but starts earlier, replace
          if (currentPriority > existingPriority || 
              (currentPriority === existingPriority && current.index < existing.index)) {
            filteredElements[j] = current;
          }
          break;
        }
      }
      
      if (shouldAdd) {
        filteredElements.push(current);
      }
    }
    
    // Re-sort after filtering
    filteredElements.sort((a, b) => a.index - b.index);
    elements.length = 0;
    elements.push(...filteredElements);
    
    // Build result by iterating through elements
    const parts = [];
    let lastIndex = 0;
    
    for (const element of elements) {
      // Add text before this element (wrapped in default span)
      if (element.index > lastIndex) {
        const beforeText = escapedCode.substring(lastIndex, element.index);
        if (beforeText) {
          parts.push(`<span class="code-value">${beforeText}</span>`);
        }
      }
      
      // Add the element itself with appropriate span
      const escapedContent = element.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      let className = 'code-value';
      if (element.type === 'comment') className = 'code-comment';
      else if (element.type === 'string') className = 'code-string';
      else if (element.type === 'selector') className = 'code-selector';
      else if (element.type === 'property') className = 'code-property';
      else if (element.type === 'value') className = 'code-value';
      else if (element.type === 'number') className = 'code-number';
      else if (element.type === 'brace') className = element.hasError ? 'code-brace-error' : 'code-value';
      else if (element.type === 'colon' || element.type === 'semicolon' || element.type === 'whitespace') className = 'code-value';
      
      if (element.hasError && element.type !== 'brace') {
        className += ' code-tag-error';
      }
      
      parts.push(`<span class="${className}">${escapedContent}</span>`);
      lastIndex = element.endIndex;
    }
    
    // Add remaining text at the end
    if (lastIndex < escapedCode.length) {
      const remaining = escapedCode.substring(lastIndex);
      if (remaining) {
        parts.push(`<span class="code-value">${remaining}</span>`);
      }
    }
    
    result = parts.join('');
  } else if (language === 'javascript') {
    // Process JavaScript similar to HTML - find all syntax elements first, then build result
    // First escape all HTML entities
    const escapedCode = result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    
    // Collect all syntax elements with their positions
    const elements = [];
    
    // Find JavaScript comments (single-line and multi-line)
    const singleLineCommentRegex = /\/\/.*$/gm;
    let match;
    while ((match = singleLineCommentRegex.exec(escapedCode)) !== null) {
      elements.push({
        index: match.index,
        endIndex: match.index + match[0].length,
        type: 'comment',
        content: match[0]
      });
    }
    
    const multiLineCommentRegex = /\/\*[\s\S]*?\*\//g;
    while ((match = multiLineCommentRegex.exec(escapedCode)) !== null) {
      // Check if this comment is already captured by single-line
      const alreadyCaptured = elements.some(e => e.index <= match.index && e.endIndex >= match.index + match[0].length);
      if (!alreadyCaptured) {
        elements.push({
          index: match.index,
          endIndex: match.index + match[0].length,
          type: 'comment',
          content: match[0]
        });
      }
    }
    
    // Find JavaScript strings (all quote types)
    const stringRegex = /(&quot;|'|`)(?:(?=(\\?))\2.)*?\1/g;
    while ((match = stringRegex.exec(escapedCode)) !== null) {
      // Check if this string is inside a comment
      const insideComment = elements.some(e => 
        e.type === 'comment' && e.index <= match.index && e.endIndex >= match.index + match[0].length
      );
      if (!insideComment) {
        elements.push({
          index: match.index,
          endIndex: match.index + match[0].length,
          type: 'string',
          content: match[0]
        });
      }
    }
    
    // Find JavaScript numbers
    const numberRegex = /\b(\d+\.?\d*)\b/g;
    while ((match = numberRegex.exec(escapedCode)) !== null) {
      // Check if this number is inside a comment or string
      const insideSpan = elements.some(e => 
        (e.type === 'comment' || e.type === 'string') && 
        e.index <= match.index && e.endIndex >= match.index + match[0].length
      );
      if (!insideSpan) {
        elements.push({
          index: match.index,
          endIndex: match.index + match[0].length,
          type: 'number',
          content: match[0]
        });
      }
    }
    
    // Find JavaScript keywords
    const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'true', 'false', 'null', 'undefined', 'this', 'class', 'extends', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'typeof', 'instanceof', 'break', 'continue', 'switch', 'case', 'default', 'do', 'in', 'of', 'with', 'static', 'super', 'get', 'set', 'yield'];
    const sortedKeywords = keywords.sort((a, b) => b.length - a.length);
    
    sortedKeywords.forEach(keyword => {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'g');
      while ((match = keywordRegex.exec(escapedCode)) !== null) {
        // Check if this keyword is inside a comment or string
        const insideSpan = elements.some(e => 
          (e.type === 'comment' || e.type === 'string') && 
          e.index <= match.index && e.endIndex >= match.index + match[0].length
        );
        if (!insideSpan) {
          const keywordIndex = match.index;
          const hasError = jsErrors.has(keywordIndex) || jsErrors.has(keywordIndex + keyword.length);
          elements.push({
            index: keywordIndex,
            endIndex: keywordIndex + match[0].length,
            type: 'keyword',
            content: keyword,
            hasError: hasError
          });
        }
      }
    });
    
    // Find JavaScript functions (identifiers before parentheses)
    const functionRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*\()/g;
    while ((match = functionRegex.exec(escapedCode)) !== null) {
      const funcName = match[1];
      // Skip if it's a keyword
      if (keywords.includes(funcName)) continue;
      
      // Check if this function is inside a comment or string
      const insideSpan = elements.some(e => 
        (e.type === 'comment' || e.type === 'string' || e.type === 'keyword') && 
        e.index <= match.index && e.endIndex >= match.index + match[0].length
      );
      if (!insideSpan) {
        elements.push({
          index: match.index,
          endIndex: match.index + funcName.length,
          type: 'function',
          content: funcName
        });
      }
    }
    
    // Find braces/brackets/parentheses with errors
    const braceRegex = /(\{|\}|\[|\]|\(|\))/g;
    while ((match = braceRegex.exec(escapedCode)) !== null) {
      const braceIndex = match.index;
      // Check if this brace is inside a comment or string
      const insideSpan = elements.some(e => 
        (e.type === 'comment' || e.type === 'string') && 
        e.index <= braceIndex && e.endIndex > braceIndex
      );
      if (!insideSpan) {
        const hasError = jsErrors.has(braceIndex);
        elements.push({
          index: braceIndex,
          endIndex: braceIndex + 1,
          type: 'brace',
          content: match[0],
          hasError: hasError
        });
      }
    }
    
    // Sort elements by index
    elements.sort((a, b) => a.index - b.index);
    
    // Build result by iterating through elements
    const parts = [];
    let lastIndex = 0;
    
    for (const element of elements) {
      // Add text before this element (wrapped in default span)
      if (element.index > lastIndex) {
        const beforeText = escapedCode.substring(lastIndex, element.index);
        if (beforeText) {
          parts.push(`<span class="code-value">${beforeText}</span>`);
        }
      }
      
      // Add the element itself with appropriate span
      const escapedContent = element.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      let className = 'code-value';
      if (element.type === 'comment') className = 'code-comment';
      else if (element.type === 'string') className = 'code-string';
      else if (element.type === 'keyword') className = 'code-keyword';
      else if (element.type === 'function') className = 'code-function';
      else if (element.type === 'number') className = 'code-number';
      else if (element.type === 'brace') className = element.hasError ? 'code-brace-error' : 'code-value';
      
      if (element.hasError && element.type !== 'brace') {
        className += ' code-tag-error';
      }
      
      parts.push(`<span class="${className}">${escapedContent}</span>`);
      lastIndex = element.endIndex;
    }
    
    // Add remaining text at the end
    if (lastIndex < escapedCode.length) {
      const remaining = escapedCode.substring(lastIndex);
      if (remaining) {
        parts.push(`<span class="code-value">${remaining}</span>`);
      }
    }
    
    result = parts.join('');
  }
  
  return result;
};

const CodeEditor = ({ value, onChange, language, placeholder }) => {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const [highlightedCode, setHighlightedCode] = useState('');
  const lastFormattedValueRef = useRef('');

  useEffect(() => {
    if (value) {
      // Format CSS with blank lines between blocks if it's CSS
      let formattedValue = value;
      
      // Only format if value changed significantly (not just minor edits)
      const valueChanged = lastFormattedValueRef.current !== value;
      
      if (language === 'css' && valueChanged) {
        // Add blank lines between CSS rules (blocks)
        // Match pattern: } followed by whitespace and then a selector
        formattedValue = value.replace(/(\})\s*([a-zA-Z.#\[&@_])/g, (match, brace, selector, offset) => {
          // Check what comes after the brace
          const afterBrace = value.substring(offset + brace.length);
          // If there's no blank line (two newlines) before the selector, add one
          if (!afterBrace.match(/^\s*\n\s*\n/)) {
            return `${brace}\n\n${selector}`;
          }
          return match;
        });
        
        // If the formatted value is different, update the actual value
        if (formattedValue !== value) {
          lastFormattedValueRef.current = formattedValue;
          onChange({ target: { value: formattedValue } });
          return;
        }
        lastFormattedValueRef.current = value;
      } else {
        lastFormattedValueRef.current = value;
      }
      
      // Don't escape here - we'll handle escaping in the highlight function
      // Apply highlighting directly to the formatted value
      const highlighted = highlightCode(formattedValue, language);
      setHighlightedCode(highlighted);
    } else {
      setHighlightedCode('');
      lastFormattedValueRef.current = '';
    }
  }, [value, language, onChange]);

  const handleScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      const scrollLeft = textareaRef.current.scrollLeft;
      
      // Sync the highlight layer by moving the pre element using transform
      const preElement = highlightRef.current.querySelector('pre');
      if (preElement) {
        preElement.style.transform = `translate(-${scrollLeft}px, -${scrollTop}px)`;
      }
    }
  };
  
  // Also sync on initial render and when content changes
  useEffect(() => {
    if (highlightRef.current && textareaRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      const scrollLeft = textareaRef.current.scrollLeft;
      const preElement = highlightRef.current.querySelector('pre');
      if (preElement) {
        preElement.style.transform = `translate(-${scrollLeft}px, -${scrollTop}px)`;
      }
    }
  }, [highlightedCode, value]);

  const handleKeyDown = (e) => {
    const textarea = textareaRef.current;
    
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange({ target: { value: newValue } });
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    } else if (language === 'html' && e.key === '>') {
      // Auto-close HTML tags when > is typed after an opening tag
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const textBefore = value.substring(0, start);
      const lines = textBefore.split('\n');
      const currentLine = lines[lines.length - 1] || '';
      
      // Check if there's an opening tag before the cursor (like <div)
      const tagMatch = currentLine.match(/<(\w+)([^>]*)$/);
      
      if (tagMatch) {
        const tagName = tagMatch[1];
        const tagAttributes = tagMatch[2] || '';
        
        // Check if it's not a closing tag (like </div) or self-closing (like <br /)
        if (!tagMatch[0].startsWith('</') && !tagAttributes.trim().endsWith('/')) {
          // Get indentation from the line with the opening tag
          const indentMatch = currentLine.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : '';
          
          // Get the position before the opening tag
          const prevLinesLength = textBefore.lastIndexOf('\n') + 1;
          const tagStartIndex = currentLine.lastIndexOf(`<${tagName}`);
          
          // Insert the closing > and create the closing tag on a new line
          const beforeTag = value.substring(0, prevLinesLength + tagStartIndex);
          const afterCursor = value.substring(end);
          
          const newValue = beforeTag + 
                           `<${tagName}${tagAttributes}>` +
                           '\n' + (indent + '  ') +
                           '\n' + indent +
                           `</${tagName}>` +
                           afterCursor;
          
          onChange({ target: { value: newValue } });
          setTimeout(() => {
            const newPos = prevLinesLength + tagStartIndex + `<${tagName}${tagAttributes}>`.length + 1 + indent.length + 2;
            textarea.selectionStart = textarea.selectionEnd = newPos;
          }, 0);
        } else {
          // Just insert the > normally
          const newValue = value.substring(0, start) + '>' + value.substring(end);
          onChange({ target: { value: newValue } });
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 1;
          }, 0);
        }
      } else {
        // No opening tag found, just insert the > normally
        const newValue = value.substring(0, start) + '>' + value.substring(end);
        onChange({ target: { value: newValue } });
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      }
    } else if ((language === 'css' || language === 'javascript') && e.key === '}') {
      // Auto-split {} when } is typed after { on the same line
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const textBefore = value.substring(0, start);
      const lines = textBefore.split('\n');
      const currentLine = lines[lines.length - 1] || '';
      const openBraceIndex = currentLine.indexOf('{');
      
      // Check if there's an opening brace on the current line
      if (openBraceIndex !== -1) {
        // Get indentation from the line with the opening brace
        const indentMatch = currentLine.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        
        // Get text between { and cursor position
        const prevLinesLength = textBefore.lastIndexOf('\n') + 1;
        const betweenBraces = value.substring(prevLinesLength + openBraceIndex + 1, start);
        
        // Remove leading/trailing whitespace from between braces
        const trimmedBetweenBraces = betweenBraces.trim();
        
        // Always split into 2 lines when } is typed
        const beforeOpenBrace = value.substring(0, prevLinesLength + openBraceIndex + 1);
        const afterCursor = value.substring(end);
        
        const newValue = beforeOpenBrace + 
                         '\n' + (indent + '  ') + trimmedBetweenBraces + 
                         '\n' + indent + 
                         '}' + 
                         afterCursor;
        
        onChange({ target: { value: newValue } });
        setTimeout(() => {
          const newPos = prevLinesLength + openBraceIndex + 1 + 1 + indent.length + 2;
          textarea.selectionStart = textarea.selectionEnd = newPos;
        }, 0);
      } else {
        // No opening brace found, just insert the closing brace normally
        const newValue = value.substring(0, start) + '}' + value.substring(end);
        onChange({ target: { value: newValue } });
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      }
    } else if (e.key === 'Enter') {
      // Auto-indent on Enter - inherit indentation from the line above
      // Auto-close braces and handle {} on same line
      e.preventDefault();
      const start = textarea.selectionStart;
      const lines = value.substring(0, start).split('\n');
      const currentLine = lines[lines.length - 1] || '';
      
      // Get the indentation (leading spaces/tabs) of the current line
      const indentMatch = currentLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      
      const textBefore = value.substring(0, start);
      const textAfter = value.substring(start);
      const linesBefore = textBefore.split('\n');
      const lastLineBefore = linesBefore[linesBefore.length - 1] || '';
      const trimmedLastLine = lastLineBefore.trim();
      const currentLineAfter = textAfter.split('\n')[0] || '';
      
      let newIndent = indent;
      let closingBrace = '';
      let closingBraceIndent = '';
      
      if (language === 'html') {
        // HTML: Check if we're between matching opening and closing tags
        const beforeTags = textBefore.match(/<(\w+)[^>]*>/g);
        const afterTags = textAfter.match(/<\/(\w+)>/g);
        
        if (beforeTags && afterTags && beforeTags.length > 0 && afterTags.length > 0) {
          const lastOpeningTag = beforeTags[beforeTags.length - 1];
          const firstClosingTag = afterTags[0];
          
          const openingTagName = lastOpeningTag.match(/<(\w+)/)?.[1];
          const closingTagName = firstClosingTag.match(/<\/(\w+)>/)?.[1];
          
          if (openingTagName && closingTagName && openingTagName.toLowerCase() === closingTagName.toLowerCase()) {
            if (trimmedLastLine.includes(`<${openingTagName}`)) {
              newIndent = indent + '  ';
            }
          }
        }
      } else if (language === 'css' || language === 'javascript') {
        // Check if we're between {} on the same line (e.g., "div {}" or "div{}")
        const openBraceIndex = currentLine.indexOf('{');
        const closeBraceIndexInLine = currentLine.indexOf('}');
        
        // Calculate cursor position within the current line
        const prevLinesLength = textBefore.lastIndexOf('\n') + 1;
        const cursorPosInLine = start - prevLinesLength;
        
        // Check if both braces exist on the same line
        if (openBraceIndex !== -1 && closeBraceIndexInLine !== -1 && closeBraceIndexInLine > openBraceIndex) {
          // Check if cursor is between the braces OR if they're adjacent (like "{}")
          const isAdjacent = closeBraceIndexInLine === openBraceIndex + 1;
          const isBetween = cursorPosInLine > openBraceIndex && cursorPosInLine <= closeBraceIndexInLine;
          
          // Always split if they're adjacent, or if cursor is between them
          if (isBetween || isAdjacent) {
            // Split: create 2 lines - content on first new line with indentation, closing brace on second new line
            const beforeOpenBrace = value.substring(0, prevLinesLength + openBraceIndex + 1);
            const betweenBraces = value.substring(prevLinesLength + openBraceIndex + 1, prevLinesLength + closeBraceIndexInLine);
            const afterCloseBrace = value.substring(prevLinesLength + closeBraceIndexInLine + 1);
            
            const newValue = beforeOpenBrace + 
                             '\n' + (indent + '  ') + betweenBraces + 
                             '\n' + indent + 
                             '}' + 
                             afterCloseBrace;
            
            onChange({ target: { value: newValue } });
            setTimeout(() => {
              const newPos = prevLinesLength + openBraceIndex + 1 + 1 + indent.length + 2;
              textarea.selectionStart = textarea.selectionEnd = newPos;
            }, 0);
            return;
          }
        }
        
        // Also check if closing brace is immediately after cursor (e.g., typed "{}" directly)
        const closeBraceIndexAfter = currentLineAfter.indexOf('}');
        if (openBraceIndex !== -1 && closeBraceIndexAfter === 0) {
          // Closing brace is right after cursor - split into 2 lines
          const beforeOpenBrace = value.substring(0, prevLinesLength + openBraceIndex + 1);
          const afterCloseBrace = value.substring(start + 1); // Skip the '}'
          
          const newValue = beforeOpenBrace + 
                           '\n' + (indent + '  ') + 
                           '\n' + indent + 
                           '}' + 
                           afterCloseBrace;
          
          onChange({ target: { value: newValue } });
          setTimeout(() => {
            const newPos = prevLinesLength + openBraceIndex + 1 + 1 + indent.length + 2;
            textarea.selectionStart = textarea.selectionEnd = newPos;
          }, 0);
          return;
        }
        
        // Check if last line ends with opening brace/bracket/paren
        const openingChars = language === 'css' ? ['{'] : ['{', '[', '('];
        const closingChars = language === 'css' ? ['}'] : ['}', ']', ')'];
        
        let shouldAutoClose = false;
        let autoCloseChar = '';
        
        for (let i = 0; i < openingChars.length; i++) {
          const openChar = openingChars[i];
          const closeChar = closingChars[i];
          
          if (trimmedLastLine.endsWith(openChar)) {
            // Check if there's already a closing brace after the cursor
            const restOfLineAfterCursor = currentLineAfter.trim();
            const nextLineAfterCursor = textAfter.split('\n')[1]?.trim() || '';
            
            // Check if closing brace exists immediately after cursor or on next line
            const hasClosingBrace = restOfLineAfterCursor.startsWith(closeChar) || 
                                   nextLineAfterCursor.startsWith(closeChar);
            
            if (!hasClosingBrace) {
              // Auto-close: add closing brace on a new line
              shouldAutoClose = true;
              autoCloseChar = closeChar;
              newIndent = indent + '  ';
              closingBrace = '\n' + indent + closeChar;
              break;
            } else {
              // Closing brace exists, just add indentation
              newIndent = indent + '  ';
            }
          }
        }
        
        // Check if we're between matching braces (but not on same line)
        if (!shouldAutoClose && !trimmedLastLine.endsWith('{') && !trimmedLastLine.endsWith('[') && !trimmedLastLine.endsWith('(')) {
          if (language === 'css') {
            if (trimmedLastLine.includes('{') && textAfter.includes('}')) {
              let braceCount = 0;
              for (let i = start - 1; i >= 0; i--) {
                if (value[i] === '}') braceCount++;
                else if (value[i] === '{') {
                  if (braceCount === 0) {
                    const braceLine = value.substring(0, i + 1).split('\n').pop() || '';
                    const braceIndent = braceLine.match(/^(\s*)/)?.[1] || '';
                    if (braceLine.trim().endsWith('{')) {
                      newIndent = braceIndent + '  ';
                    }
                    break;
                  }
                  braceCount--;
                }
              }
            }
          } else if (language === 'javascript') {
            if (trimmedLastLine.includes('{') && textAfter.includes('}')) {
              let braceCount = 0;
              for (let i = start - 1; i >= 0; i--) {
                if (value[i] === '}') braceCount++;
                else if (value[i] === '{') {
                  if (braceCount === 0) {
                    const braceLine = value.substring(0, i + 1).split('\n').pop() || '';
                    const braceIndent = braceLine.match(/^(\s*)/)?.[1] || '';
                    if (braceLine.trim().endsWith('{')) {
                      newIndent = braceIndent + '  ';
                    }
                    break;
                  }
                  braceCount--;
                }
              }
            }
          }
        }
      }
      
      // Insert newline with indentation and auto-closing brace if needed
      const newValue = value.substring(0, start) + '\n' + newIndent + value.substring(start) + closingBrace;
      onChange({ target: { value: newValue } });
      
      // Position cursor after the indentation
      setTimeout(() => {
        const newPos = start + 1 + newIndent.length;
        textarea.selectionStart = textarea.selectionEnd = newPos;
      }, 0);
    }
  };

  return (
    <div className="code-editor-wrapper">
      <div className="code-editor-highlight" ref={highlightRef}>
        <pre><code dangerouslySetInnerHTML={{ __html: highlightedCode || '' }} /></pre>
      </div>
      <textarea
        ref={textareaRef}
        className={`code-editor-textarea code-editor-${language}`}
        value={value}
        onChange={onChange}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
    </div>
  );
};

export default CodeEditor;

