/**
 * 파일 역할: 기업회원 전용 밤치트 번호 검색 및 코멘트 작성 API를 처리하는 컨트롤러 파일.
 */
const blackDbModel = require('../models/blackDbModel');

const REGION_DISTRICT_MAP = {
  서울: ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
  경기: ['가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
  인천: ['강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'],
  부산: ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
  대구: ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
  광주: ['광산구', '남구', '동구', '북구', '서구'],
  대전: ['대덕구', '동구', '서구', '유성구', '중구'],
  울산: ['남구', '동구', '북구', '울주군', '중구'],
  강원: ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'],
  경남: ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'],
  경북: ['경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'],
  전남: ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
  전북: ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'],
  충남: ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'],
  충북: ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청원군', '청주시', '충주시'],
  세종: ['세종시'],
  제주: ['서귀포시', '제주시']
};

function isAdminUser(user) {
  return String(user?.role || '').toUpperCase() === 'ADMIN';
}

function isBusinessUser(user) {
  const role = String(user?.role || '').toUpperCase();
  const memberType = String(user?.memberType || user?.member_type || '').toUpperCase();
  return role === 'BUSINESS' || memberType === 'BUSINESS';
}

function requireBusinessUser(req, res, next) {
  if (!isBusinessUser(req.user) && !isAdminUser(req.user)) {
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

    const comments = await blackDbModel.findCommentsByPhoneNumber(phoneNumber, req.user.id);
    return res.json({ phoneNumber, comments, hasComments: comments.length > 0 });
  } catch (error) {
    return next(error);
  }
}

function parsePositiveId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function createBlackDbComment(req, res, next) {
  try {
    const phoneNumber = blackDbModel.normalizePhoneNumber(req.body?.phoneNumber);
    const region = String(req.body?.region || '').trim();
    const district = String(req.body?.district || '').trim();
    const comment = String(req.body?.comment || '').trim();

    if (!phoneNumber || phoneNumber.length < 7 || phoneNumber.length > 20) {
      return res.status(400).json({ message: '번호는 7~20자리 숫자로 입력해주세요.' });
    }
    if (!REGION_DISTRICT_MAP[region]) {
      return res.status(400).json({ message: '활동 시/도를 선택해주세요.' });
    }
    if (!district || !REGION_DISTRICT_MAP[region].includes(district)) {
      return res.status(400).json({ message: '활동 구/군을 선택해주세요.' });
    }
    if (!comment || comment.length > 1000) {
      return res.status(400).json({ message: '코멘트는 1~1000자 이내로 입력해주세요.' });
    }

    const createdComment = await blackDbModel.createComment({
      phoneNumber,
      authorUserId: req.user.id,
      region,
      district,
      comment
    });

    return res.status(201).json({ comment: createdComment });
  } catch (error) {
    return next(error);
  }
}

async function recommendBlackDbComment(req, res, next) {
  try {
    const commentId = parsePositiveId(req.params.commentId);
    if (!commentId) {
      return res.status(400).json({ message: '유효하지 않은 코멘트 ID입니다.' });
    }

    const recommendation = await blackDbModel.toggleCommentRecommendation({
      commentId,
      userId: req.user.id
    });

    return res.json(recommendation);
  } catch (error) {
    return next(error);
  }
}

async function deleteBlackDbComment(req, res, next) {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ message: '관리자만 삭제할 수 있습니다.' });
    }

    const commentId = parsePositiveId(req.params.commentId);
    if (!commentId) {
      return res.status(400).json({ message: '유효하지 않은 코멘트 ID입니다.' });
    }

    const deleted = await blackDbModel.deleteComment(commentId);
    if (!deleted) {
      return res.status(404).json({ message: '삭제할 코멘트를 찾을 수 없습니다.' });
    }

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireBusinessUser,
  searchBlackDbComments,
  createBlackDbComment,
  recommendBlackDbComment,
  deleteBlackDbComment
};
