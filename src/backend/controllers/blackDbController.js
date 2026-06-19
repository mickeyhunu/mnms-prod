/**
 * 파일 역할: 기업회원 전용 BLACK DB 번호 검색 및 코멘트 작성 API를 처리하는 컨트롤러 파일.
 */
const blackDbModel = require('../models/blackDbModel');

function isBusinessUser(user) {
  const role = String(user?.role || '').toUpperCase();
  const memberType = String(user?.memberType || user?.member_type || '').toUpperCase();
  return role === 'BUSINESS' || memberType === 'BUSINESS';
}

function requireBusinessUser(req, res, next) {
  if (!isBusinessUser(req.user)) {
    return res.status(403).json({ message: '기업회원만 이용할 수 있습니다.' });
  }
  return next();
}

async function searchBlackDbComments(req, res, next) {
  try {
    const phoneNumber = blackDbModel.normalizePhoneNumber(req.query.phoneNumber);
    if (!phoneNumber || phoneNumber.length < 7 || phoneNumber.length > 20) {
      return res.status(400).json({ message: '검색할 번호를 7~20자리 숫자로 입력해주세요.' });
    }

    const comments = await blackDbModel.findCommentsByPhoneNumber(phoneNumber);
    return res.json({ phoneNumber, comments, hasComments: comments.length > 0 });
  } catch (error) {
    return next(error);
  }
}

async function createBlackDbComment(req, res, next) {
  try {
    const phoneNumber = blackDbModel.normalizePhoneNumber(req.body?.phoneNumber);
    const comment = String(req.body?.comment || '').trim();

    if (!phoneNumber || phoneNumber.length < 7 || phoneNumber.length > 20) {
      return res.status(400).json({ message: '번호는 7~20자리 숫자로 입력해주세요.' });
    }
    if (!comment || comment.length > 1000) {
      return res.status(400).json({ message: '코멘트는 1~1000자 이내로 입력해주세요.' });
    }

    const createdComment = await blackDbModel.createComment({
      phoneNumber,
      authorUserId: req.user.id,
      comment
    });

    return res.status(201).json({ comment: createdComment });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireBusinessUser,
  searchBlackDbComments,
  createBlackDbComment
};
