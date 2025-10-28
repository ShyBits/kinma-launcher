import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Minimize2 } from 'lucide-react';
import './SupportChat.css';

const SupportChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Welcome! How can we help you today?',
      sender: 'admin',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage = {
        id: messages.length + 1,
        text: inputMessage,
        sender: 'user',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setInputMessage('');

      // Simulate admin response after 1.5 seconds
      setTimeout(() => {
        const adminResponse = {
          id: messages.length + 2,
          text: 'Thanks for your message! An admin will respond shortly.',
          sender: 'admin',
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, adminResponse]);
      }, 1500);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Support Button */}
      {!isOpen && (
        <button 
          className="support-btn"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
        >
          <MessageSquare size={20} />
          <span>Support</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`support-chat ${isMinimized ? 'minimized' : ''}`}>
          {/* Chat Header */}
          <div className="support-chat-header">
            <div className="support-chat-title">
              <MessageSquare size={18} />
              <span>Support Chat</span>
            </div>
            <div className="support-chat-actions">
              <button 
                className="chat-btn-minimize" 
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                <Minimize2 size={16} />
              </button>
              <button 
                className="chat-btn-close" 
                onClick={() => {
                  setIsOpen(false);
                  setIsMinimized(false);
                }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          {!isMinimized && (
            <>
              <div className="support-chat-messages">
                {messages.map(message => (
                  <div 
                    key={message.id} 
                    className={`support-message ${message.sender === 'user' ? 'user-message' : 'admin-message'}`}
                  >
                    <div className="message-bubble">
                      <p>{message.text}</p>
                      <span className="message-time">{message.time}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="support-chat-input">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button 
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default SupportChat;

