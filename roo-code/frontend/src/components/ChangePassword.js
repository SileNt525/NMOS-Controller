import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Container, Alert } from '@mui/material';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    setSuccess(false);

    // 验证新密码和确认密码是否一致
    if (newPassword !== confirmPassword) {
      setError('新密码和确认密码不一致');
      return;
    }

    // 调用后端API进行密码修改
    fetch('/api/users/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (data.message === 'Password updated successfully') {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError('密码修改失败：' + data.detail);
      }
    })
    .catch(error => {
      setError('密码修改失败，请检查当前密码是否正确');
      console.error('Error:', error);
    });
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          修改密码
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            name="currentPassword"
            label="当前密码"
            type="password"
            autoFocus
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="newPassword"
            label="新密码"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="确认新密码"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">密码修改成功</Alert>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            确认修改
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default ChangePassword;