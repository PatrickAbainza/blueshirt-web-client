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
  backgroundColor: BLUESHIRT_LIGHT,
});

// Header Styles
const Header = styled(Paper)({
  padding: '16px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: BLUESHIRT_BLUE,
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  position: 'relative',
  zIndex: 1,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
});

const TitleSection = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

const SmallLogo = styled('img')({
  height: '32px',
  width: 'auto',
  filter: 'brightness(0) invert(1)', // Makes the logo white
});

const Title = styled(Typography)({
  fontSize: '24px',
  fontWeight: 700, // Bolder font for Filipino-style impact
  color: '#FFFFFF',
  margin: 0,
  letterSpacing: '0.5px',
});

const ProjectCredit = styled(Typography)({
  fontSize: '14px',
  color: 'rgba(255, 255, 255, 0.9)',
  fontWeight: 500,
});

// Chat Container Styles
const ChatContainer = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  padding: '20px',
  position: 'relative',
  backgroundColor: BLUESHIRT_LIGHT,
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
  },
  '&::-webkit-scrollbar-thumb': {
    background: BLUESHIRT_GRAY,
    borderRadius: '8px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#555',
  },
});

const ChatBackgroundWatermark = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '60%',
  height: 'auto',
  opacity: 0.03,
  pointerEvents: 'none',
  zIndex: 0,
  '& img': {
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
  },
});

const ChatContent = styled(Box)({
  position: 'relative',
  zIndex: 1,
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
  color: '#fff',
  marginBottom: '20px',
  fontWeight: 500,
});

const MessageBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})<{ isUser: boolean }>(({ isUser }) => ({
  padding: '12px 16px',
  maxWidth: '85%',
  borderRadius: '16px',
  backgroundColor: isUser ? BLUESHIRT_BLUE : '#FFFFFF',
  color: isUser ? '#FFFFFF' : '#000000',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  position: 'relative',
  '&:before': {
    content: '""',
    position: 'absolute',
    bottom: '8px',
    [isUser ? 'right' : 'left']: '-8px',
    borderStyle: 'solid',
    borderWidth: '8px',
    borderColor: 'transparent',
    borderRightColor: isUser ? 'transparent' : '#FFFFFF',
    borderLeftColor: isUser ? BLUESHIRT_BLUE : 'transparent',
    transform: isUser ? 'none' : 'rotate(180deg)',
  },
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
  backgroundColor: BLUESHIRT_YELLOW,
  color: '#000000',
  padding: '8px 16px',
  borderRadius: '8px',
  textTransform: 'none',
  fontWeight: 600,
  '&:hover': {
    backgroundColor: '#FFE44D',
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
  padding: '16px',
  backgroundColor: '#FFFFFF',
  borderTop: '1px solid #E9ECEF',
  display: 'flex',
  gap: '12px',
  boxShadow: '0 -2px 4px rgba(0,0,0,0.05)',
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
        <TitleSection>
          <SmallLogo src="/assets/images/blueshirt-logo.png" alt="Blueshirt Logo" />
          <Title variant="h1">Blueshirt Resume Builder</Title>
        </TitleSection>
        <ProjectCredit>
          A Project of Mayor Eric B. Africa
        </ProjectCredit>
        {serverError && (
          <Typography
            color="error"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              position: 'absolute',
              bottom: '-28px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#FFE0E0',
              padding: '6px 12px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              color: '#D32F2F',
              fontWeight: 500,
            }}
          >
            <span>⚠️</span> Server connection lost
          </Typography>
        )}
      </Header>

      <ProgressIndicator progress={profileProgress} />
      
      <ChatContainer ref={chatContainerRef}>
        <ChatBackgroundWatermark>
          <img src="/assets/images/gapan-logo.png" alt="Gapan City Logo" />
        </ChatBackgroundWatermark>
        
        <ChatContent>
          <WatermarkContainer>
            <LogoContainer>
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
                  color: BLUESHIRT_GRAY,
                  marginTop: '4px',
                  marginX: '8px',
                }}
              >
                {message.timestamp.toLocaleTimeString()}
              </Typography>
            </Box>
          ))}
        </ChatContent>
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
              backgroundColor: '#FFFFFF',
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
