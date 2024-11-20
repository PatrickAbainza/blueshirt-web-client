import React, { useState, useRef, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Avatar,
  Button,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';
import ProgressIndicator from './ProgressIndicator';

const RASA_SERVER_URL = process.env.REACT_APP_RASA_API_URL || 'http://localhost:5005';

// Design System Constants
const BLUESHIRT_BLUE = '#007BFF';
const BLUESHIRT_YELLOW = '#FFD700';
const BLUESHIRT_GRAY = '#6C757D';
const BLUESHIRT_LIGHT = '#F8F9FA';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  buttons?: Array<{
    title: string;
    payload: string;
  }>;
}

interface Section {
  name: string;
  completed: boolean;
  fields: string[];
  completedFields: string[];
}

interface ProfileProgress {
  sections: Section[];
  overallProgress: number;
}

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  backgroundColor: '#f9f9f9',
  fontFamily: 'Arial, sans-serif',
});

const Header = styled(Paper)({
  padding: '20px',
  backgroundColor: '#007bff',
  color: '#fff',
  textAlign: 'center',
  boxShadow: 'none',
  borderRadius: 0,
});

const HeaderTitle = styled(Typography)({
  fontSize: '24px',
  fontWeight: 'bold',
  margin: 0,
});

const HeaderSubtitle = styled(Typography)({
  fontSize: '0.9rem',
  marginTop: '5px',
  opacity: 0.9,
});

const ChatContainer = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'relative',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#555',
  },
});

const MessageContainer = styled(Box)({
  maxWidth: '600px',
  width: '100%',
  margin: '20px auto',
  padding: '20px',
  backgroundColor: '#fff',
  borderRadius: '10px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  position: 'relative',
});

const ChatBackgroundWatermark = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '50%',
  height: 'auto',
  opacity: 0.05,
  pointerEvents: 'none',
  zIndex: 0,
  '& img': {
    width: '100%',
    height: 'auto',
  },
});

const MessageBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})<{ isUser: boolean }>(({ isUser }) => ({
  padding: '15px 20px',
  backgroundColor: isUser ? '#007bff' : '#fff',
  color: isUser ? '#fff' : '#000',
  borderRadius: '5px',
  marginBottom: '10px',
  width: '100%',
  boxShadow: 'none',
  border: isUser ? 'none' : '1px solid #eee',
}));

const ActionButton = styled(Button)({
  width: '100%',
  padding: '10px 20px',
  fontSize: '1rem',
  backgroundColor: '#007bff',
  color: '#fff',
  textTransform: 'none',
  borderRadius: '5px',
  marginBottom: '15px',
  '&:hover': {
    backgroundColor: '#0056b3',
  },
  '& small': {
    display: 'block',
    fontSize: '0.8rem',
    opacity: 0.8,
  },
});

const InputContainer = styled(Box)({
  padding: '20px',
  backgroundColor: '#fff',
  borderTop: '1px solid #eee',
  display: 'flex',
  gap: '10px',
  maxWidth: '600px',
  margin: '0 auto',
  width: '100%',
});

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [serverError, setServerError] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [profileProgress, setProfileProgress] = useState<ProfileProgress>({
    sections: [
      {
        name: 'Personal Information',
        completed: false,
        fields: ['first_name', 'last_name', 'email', 'phone', 'location', 'birthday'],
        completedFields: []
      },
      {
        name: 'Work Experience',
        completed: false,
        fields: ['current_job', 'past_jobs', 'skills', 'years_experience'],
        completedFields: []
      },
      {
        name: 'Education',
        completed: false,
        fields: ['highest_education', 'school', 'course', 'year_completed'],
        completedFields: []
      },
      {
        name: 'Skills & Preferences',
        completed: false,
        fields: ['technical_skills', 'soft_skills', 'preferred_industry', 'expected_salary'],
        completedFields: []
      }
    ],
    overallProgress: 0
  });

  useEffect(() => {
    // Calculate overall progress whenever sections change
    const totalFields = profileProgress.sections.reduce((acc, section) => acc + section.fields.length, 0);
    const completedFields = profileProgress.sections.reduce((acc, section) => acc + section.completedFields.length, 0);
    const newOverallProgress = (completedFields / totalFields) * 100;
    
    if (newOverallProgress !== profileProgress.overallProgress) {
      setProfileProgress(prev => ({
        ...prev,
        overallProgress: newOverallProgress
      }));
    }
  }, [profileProgress.sections]);

  // Update progress when receiving bot messages with slot values
  const updateProgressFromSlots = (slots: any) => {
    setProfileProgress((prev: ProfileProgress) => {
      const newSections = prev.sections.map(section => {
        const newCompletedFields = section.fields.filter(field => 
          slots[field] !== null && slots[field] !== undefined && slots[field] !== ''
        );
        
        return {
          ...section,
          completedFields: newCompletedFields,
          completed: newCompletedFields.length === section.fields.length,
        };
      });

      const totalFields = prev.sections.reduce((sum, section) => sum + section.fields.length, 0);
      const completedFields = newSections.reduce((sum, section) => sum + section.completedFields.length, 0);
      const newOverallProgress = (completedFields / totalFields) * 100;

      return {
        sections: newSections,
        overallProgress: newOverallProgress,
      };
    });
  };

  const handleButtonClick = async (payload: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: payload,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Send message to Rasa
      const response = await axios.post(`${RASA_SERVER_URL}/webhooks/rest/webhook`, {
        sender: 'user',
        message: payload
      });

      // Add bot response
      if (response.data && response.data.length > 0) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.data[0].text,
          sender: 'bot',
          timestamp: new Date(),
          buttons: response.data[0].buttons
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error sending message to Rasa:', error);
      setServerError(true);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "I apologize, but I'm unable to connect to the server at the moment. Please make sure the Rasa servers are running and try again.",
        sender: 'bot',
        timestamp: new Date(),
      }]);
    }
  };

  useEffect(() => {
    // Add welcome message
    setMessages([
      {
        id: '1',
        text: "Magandang araw! Ako si Blessie, ang iyong virtual assistant mula sa Blueshirt Philippines - ang job portal para sa mga Pinoy blue collar workers. Ang aking misyon ay tulungan kang gumawa ng mas magandang resume para mas madali kang makahanap ng trabaho.\n\nPaano kita matutulungan ngayong araw?",
        sender: 'bot',
        timestamp: new Date(),
        buttons: [
          {
            title: "Gumawa ng bagong resume",
            payload: "/profile_builder"
          },
          {
            title: "Pagandahin ang iyong kasalukuyang resume",
            payload: "/improve_existing_resume"
          },
          {
            title: "Humanap ng trabahong angkop sa iyo",
            payload: "/job_matching"
          },
          {
            title: "Alamin ang mga training na makakatulong sa iyong career",
            payload: "/training_recommendations"
          }
        ]
      },
    ]);
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    try {
      const response = await axios.post(`${RASA_SERVER_URL}/webhooks/rest/webhook`, {
        sender: 'user',
        message: inputText,
      });

      const botResponses: Message[] = response.data.map((msg: any) => ({
        id: Math.random().toString(),
        text: msg.text || '',
        sender: 'bot',
        timestamp: new Date(),
      }));

      setMessages(prev => [...prev, ...botResponses]);
    } catch (error) {
      console.error('Error sending message to Rasa:', error);
      setServerError(true);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "I apologize, but I'm unable to connect to the server at the moment. Please make sure the Rasa servers are running and try again.",
        sender: 'bot',
        timestamp: new Date(),
      }]);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const inputPlaceholder = "Mag-type ng mensahe sa Filipino o English...";

  return (
    <Container>
      <Header elevation={0}>
        <HeaderTitle variant="h1">Blueshirt Resume Builder</HeaderTitle>
        <HeaderSubtitle>A Project of Mayor Eric B. Africa</HeaderSubtitle>
      </Header>

      <ProgressIndicator progress={profileProgress} />
      
      <ChatContainer ref={chatContainerRef}>
        <ChatBackgroundWatermark>
          <img src="/assets/images/gapan-logo.png" alt="Gapan City Logo" />
        </ChatBackgroundWatermark>

        {messages.map((message) => (
          <MessageContainer key={message.id}>
            <MessageBubble isUser={message.sender === 'user'}>
              <Typography style={{ whiteSpace: 'pre-line' }}>
                {message.text}
              </Typography>
              {message.buttons && message.sender === 'bot' && (
                <Box sx={{ mt: 2 }}>
                  {message.buttons.map((button, index) => {
                    const [title, description] = button.title.split('\n');
                    return (
                      <ActionButton
                        key={index}
                        onClick={() => handleButtonClick(button.payload)}
                        fullWidth
                      >
                        {title}
                        <small>{description}</small>
                      </ActionButton>
                    );
                  })}
                </Box>
              )}
            </MessageBubble>
            <Typography
              variant="caption"
              sx={{
                color: '#666',
                fontSize: '0.9rem',
                display: 'block',
                textAlign: message.sender === 'user' ? 'right' : 'left',
                mt: 1,
              }}
            >
              {message.timestamp.toLocaleTimeString()}
            </Typography>
          </MessageContainer>
        ))}
      </ChatContainer>

      <InputContainer>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={inputPlaceholder}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          multiline
          maxRows={4}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#fff',
              '& fieldset': {
                borderColor: '#eee',
              },
              '&:hover fieldset': {
                borderColor: '#007bff',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
              },
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!inputText.trim()}
          sx={{
            backgroundColor: inputText.trim() ? '#007bff' : '#eee',
            color: '#fff',
            '&:hover': {
              backgroundColor: inputText.trim() ? '#0056b3' : '#eee',
            },
          }}
        >
          <SendIcon />
        </IconButton>
      </InputContainer>
    </Container>
  );
};

export default ChatInterface;
