import React from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  LinearProgress,
  Typography,
  Tooltip,
  Paper,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

const Container = styled(Paper)({
  padding: '16px',
  marginBottom: '16px',
  backgroundColor: '#fff',
  borderRadius: '8px',
});

const SectionContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginTop: '8px',
  gap: '8px',
});

const ProgressText = styled(Typography)({
  fontSize: '0.875rem',
  color: '#666',
});

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

interface ProgressIndicatorProps {
  progress: ProfileProgress;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ progress }) => {
  return (
    <Container elevation={1}>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            Profile Progress
          </Typography>
          <ProgressText>
            {Math.round(progress.overallProgress)}% Complete
          </ProgressText>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={progress.overallProgress} 
          sx={{ 
            height: 8, 
            borderRadius: 4,
            backgroundColor: '#E0E0E0',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#007BFF',
            }
          }} 
        />

        <Box sx={{ mt: 2 }}>
          {progress.sections.map((section) => (
            <Tooltip 
              key={section.name}
              title={`${section.completedFields.length}/${section.fields.length} fields completed`}
              arrow
            >
              <SectionContainer>
                {section.completed ? (
                  <CheckCircleIcon sx={{ color: '#007BFF' }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ color: '#666' }} />
                )}
                <Typography variant="body2">
                  {section.name}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <ProgressText>
                  {Math.round((section.completedFields.length / section.fields.length) * 100)}%
                </ProgressText>
              </SectionContainer>
            </Tooltip>
          ))}
        </Box>
      </Box>
    </Container>
  );
};

export default ProgressIndicator;
