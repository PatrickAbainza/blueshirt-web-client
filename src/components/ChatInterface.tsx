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
const BLUESHIRT_BLUE = '#007BFF';
const BLUESHIRT_YELLOW = '#FFD700';

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
  backgroundColor: '#F8F9FA',
});

const Header = styled(Paper)({
  padding: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid #E9ECEF',
  backgroundColor: '#fff',
  zIndex: 1,
  '@media (max-width: 600px)': {
    padding: '10px',
  },
});

const TitleContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  flex: '1',
  '@media (max-width: 600px)': {
    gap: '10px',
  },
});

const RightContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '3px',
  marginLeft: '12px',
});

const Logo = styled('img')({
  height: '42px',
  width: 'auto',
  objectFit: 'contain',
  '@media (max-width: 600px)': {
    height: '32px',
  },
});

const ChatContainer = styled(Box)({
  flex: 1,
  overflow: 'auto',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  '@media (max-width: 600px)': {
    padding: '12px',
  },
});

const WatermarkContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  gap: '20px',
  marginBottom: '30px',
});

const LogoContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  maxWidth: '600px',
  marginBottom: '20px',
});

const Logo = styled('img')({
  height: '80px',
  width: 'auto',
  objectFit: 'contain',
});

const WelcomeText = styled(Typography)({
  textAlign: 'center',
  color: '#333',
  marginBottom: '20px',
  fontWeight: 500,
});

const MessageBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})<{ isUser: boolean }>(({ isUser }) => ({
  maxWidth: '85%',
  padding: '12px',
  marginBottom: '8px',
  borderRadius: '16px',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser ? BLUESHIRT_BLUE : '#fff',
  color: isUser ? '#fff' : '#212529',
  borderBottomRightRadius: isUser ? '4px' : '16px',
  borderBottomLeftRadius: isUser ? '16px' : '4px',
  border: isUser ? 'none' : '1px solid #E9ECEF',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}));

const ButtonContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  marginTop: '12px',
  width: '100%',
  maxWidth: '400px',
});

const ActionButton = styled(Button)({
  textAlign: 'left',
  justifyContent: 'flex-start',
  textTransform: 'none',
  backgroundColor: '#F8F9FA',
  color: BLUESHIRT_BLUE,
  border: `1px solid ${BLUESHIRT_BLUE}`,
  padding: '12px 16px',
  lineHeight: 1.4,
  '&:hover': {
    backgroundColor: BLUESHIRT_BLUE,
    color: '#fff',
  },
});

const ButtonTitle = styled('span')({
  fontWeight: 700,
  marginRight: '8px',
});

const ButtonDescription = styled('span')({
  display: 'block',
  marginTop: '4px',
  fontSize: '0.9em',
  opacity: 0.9,
});

const InputContainer = styled(Box)({
  padding: '12px',
  backgroundColor: '#fff',
  borderTop: '1px solid #E9ECEF',
  display: 'flex',
  gap: '8px',
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
      <Header>
        <TitleContainer>
          <Avatar
            src="/assets/images/blueshirt-logo.png"
            alt="Blueshirt Logo"
            sx={{ width: 40, height: 40, marginRight: 2 }}
          />
          <Typography variant="h6">
            Blueshirt Resume Bot
          </Typography>
        </TitleContainer>
        {serverError && (
          <Typography 
            variant="subtitle2" 
            color="error" 
            sx={{ 
              backgroundColor: '#ffebee', 
              padding: '4px 8px', 
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>⚠️</span> Server connection lost
          </Typography>
        )}
      </Header>
      <ProgressIndicator progress={profileProgress} />
      <ChatContainer ref={chatContainerRef}>
        <WatermarkContainer>
          <LogoContainer>
            <Logo src="/assets/images/gapan-logo.png" alt="Gapan Logo" />
            <Logo src="/assets/images/blueshirt-logo-text.png" alt="Blueshirt Logo" />
            <Logo src="/assets/images/mayor-logo.png" alt="Mayor Logo" />
          </LogoContainer>
          <WelcomeText variant="h6">
            A project of Mayor Eric Pascual and the City Government of Gapan
          </WelcomeText>
        </WatermarkContainer>
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 2,
            }}
          >
            <MessageBubble isUser={message.sender === 'user'}>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {message.text}
              </Typography>
              {message.buttons && message.sender === 'bot' && (
                <ButtonContainer>
                  {message.buttons.map((button, index) => {
                    const [title, description] = button.title.split('\n');
                    return (
                      <ActionButton
                        key={index}
                        variant="outlined"
                        onClick={() => handleButtonClick(button.payload)}
                        fullWidth
                      >
                        <Box sx={{ width: '100%' }}>
                          <ButtonTitle>{title}</ButtonTitle>
                          <ButtonDescription>{description}</ButtonDescription>
                        </Box>
                      </ActionButton>
                    );
                  })}
                </ButtonContainer>
              )}
            </MessageBubble>
            <Typography
              variant="caption"
              sx={{
                color: '#6C757D',
                marginTop: '4px',
                marginX: '8px',
              }}
            >
              {message.timestamp.toLocaleTimeString()}
            </Typography>
          </Box>
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
              backgroundColor: '#F8F9FA',
              borderRadius: '24px',
              '& fieldset': {
                borderColor: '#E9ECEF',
              },
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!inputText.trim()}
          sx={{
            backgroundColor: inputText.trim() ? BLUESHIRT_YELLOW : '#E9ECEF',
            width: 48,
            height: 48,
            '&:hover': {
              backgroundColor: inputText.trim() ? '#FFE44D' : '#E9ECEF',
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
