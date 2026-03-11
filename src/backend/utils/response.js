function pickUserRow(user) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    isAdmin: user.role === 'ADMIN'
  };
}

module.exports = { pickUserRow };
