/**
 * 파일 역할: 관리자 전용 API 엔드포인트와 컨트롤러를 매핑하는 라우트 파일.
 */
const express = require('express');
const postModel = require('../models/postModel');
const adminModel = require('../models/adminModel');
const liveModel = require('../models/liveModel');
const supportController = require('../controllers/supportController');
const supportModel = require('../models/supportModel');
const { findByNicknameExceptUser } = require('../models/userModel');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { LOGIN_STATUS } = require('../utils/loginRestriction');
const { deleteS3ObjectByUrl, deleteS3ObjectsByUrls } = require('../utils/fileUpload');
const { collectBusinessInfoImageUrls, deleteRejectedBusinessInfoImages, deleteUnreferencedBusinessInfoImages } = require('../utils/businessProfileImages');
const { validateNickname } = require('../utils/nicknamePolicy');
const { validatePassword } = require('../utils/authPolicy');
const { hashPassword } = require('../utils/passwordHasher');

const router = express.Router();

function isBusinessAuthor(item) {
  const role = String(item?.authorRole || item?.author_role || item?.role || '').toUpperCase();
  const memberType = String(item?.authorMemberType || item?.memberType || item?.member_type || '').toUpperCase();
  return role === 'BUSINESS' || memberType === 'BUSINESS';
}

function hasSubmittedBusinessDocument(profile = {}, imageNameKey, imageDataUrlKey) {
  const businessInfo = profile.businessInfo || {};
  const imageName = String(businessInfo?.[imageNameKey] || '').trim();
  const imageDataUrl = String(businessInfo?.[imageDataUrlKey] || '').trim();
  return Boolean(imageName && imageName !== '등록할 이미지를 선택해주세요.' && imageDataUrl);
}

function hasRequiredBusinessReviewDocuments(profile = {}) {
  return hasSubmittedBusinessDocument(profile, 'licenseImageName', 'licenseImageDataUrl')
    && hasSubmittedBusinessDocument(profile, 'permitImageName', 'permitImageDataUrl');
}

function isMasterAdminUser(user = {}) {
  return String(user?.login_id || '').trim().toLowerCase() === 'master';
}

function isManagedUserAccount(user = {}) {
  const role = String(user?.role || '').toUpperCase();
  return role === 'MEMBER' || role === 'BUSINESS';
}

function revealAnonymousAuthorForAdmin(item) {
  const boardType = String(item?.boardType || item?.board_type || '').toUpperCase();
  if (boardType !== 'ANON' || isBusinessAuthor(item)) {
    return item;
  }

  const nickname = String(item?.authorNickname || '').trim();
  return {
    ...item,
    authorNickname: nickname && nickname !== '익명' ? `익명(${nickname})` : '익명'
  };
}

router.use(authMiddleware, adminMiddleware);


router.get('/review-summary', async (req, res, next) => {
  try {
    const [pendingInquiries, pendingBusinessApplications, recentInquiries, recentBusinessApplications] = await Promise.all([
      supportModel.countPendingInquiries(),
      adminModel.countPendingBusinessApplications(),
      supportModel.listRecentPendingInquiries({ limit: 5 }),
      adminModel.listRecentPendingBusinessApplications({ limit: 5 })
    ]);

    res.json({
      pendingInquiries,
      pendingBusinessApplications,
      totalPending: pendingInquiries + pendingBusinessApplications,
      recentInquiries,
      recentBusinessApplications
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats/dashboard', async (req, res, next) => {
  try {
    const rangeDays = Number.parseInt(req.query.rangeDays || '14', 10);
    const period = String(req.query.period || 'daily').toLowerCase();
    const dashboard = await adminModel.getDashboardStats(rangeDays, { period });
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

router.get('/posts', async (req, res, next) => {
  try {
    const { rows, total } = await postModel.listPosts(0, 10000, { boardType: 'ALL' });
    const content = rows.map((post) => revealAnonymousAuthorForAdmin(post));
    res.json({ content, totalElements: total });
  } catch (error) {
    next(error);
  }
});

router.get('/comments', async (req, res, next) => {
  try {
    const rows = await postModel.listAllCommentsForAdmin();
    const content = rows.map((comment) => revealAnonymousAuthorForAdmin(comment));
    res.json({ content, totalElements: content.length });
  } catch (error) {
    next(error);
  }
});


router.put('/posts/:id/hide', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });

    const post = await postModel.findPostByIdIncludingDeleted(id);
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (post.is_deleted) return res.status(400).json({ message: '이미 삭제된 게시글입니다.' });

    const isHidden = Boolean(req.body?.isHidden);
    await postModel.setPostHidden(id, isHidden);
    res.json({ success: true, isHidden });
  } catch (error) {
    next(error);
  }
});

router.delete('/posts/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });

    const post = await postModel.findPostByIdIncludingDeleted(id);
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (post.is_deleted) return res.status(400).json({ message: '이미 삭제된 게시글입니다.' });

    await postModel.deletePost(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});


router.put('/comments/:id/hide', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 댓글 ID입니다.' });

    const comment = await postModel.findCommentById(id);
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (comment.is_deleted) return res.status(400).json({ message: '이미 삭제된 댓글입니다.' });

    const isHidden = Boolean(req.body?.isHidden);
    await postModel.setCommentHidden(id, isHidden);
    res.json({ success: true, isHidden });
  } catch (error) {
    next(error);
  }
});

router.delete('/comments/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 댓글 ID입니다.' });

    const comment = await postModel.findCommentById(id);
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (comment.is_deleted) return res.status(400).json({ message: '이미 삭제된 댓글입니다.' });

    await postModel.deleteComment(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});


router.get('/business-applications', async (req, res, next) => {
  try {
    const rows = await adminModel.listBusinessApplications();
    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
});

router.put('/business-applications/:userId/review', async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ message: '유효하지 않은 회원 ID입니다.' });

    const approvalStatus = String(req.body?.approvalStatus || '').toUpperCase();
    const rejectionReason = String(req.body?.rejectionReason || '').trim();
    const documentReviewConfirmed = req.body?.documentReviewConfirmed === true;

    if (!['APPROVED', 'REJECTED'].includes(approvalStatus)) {
      return res.status(400).json({ message: '승인 또는 반려 상태를 선택해주세요.' });
    }

    if (approvalStatus === 'REJECTED' && (!rejectionReason || rejectionReason.length > 500)) {
      return res.status(400).json({ message: '기업회원 신청/변경 반려 사유는 1자 이상 500자 이하로 입력해주세요.' });
    }

    const profile = await adminModel.findBusinessApplicationByUserId(userId);
    if (!profile) return res.status(404).json({ message: '기업회원 신청/변경 내역을 찾을 수 없습니다.' });

    if (!documentReviewConfirmed) {
      return res.status(400).json({ message: '사업자등록증과 영업허가증 첨부 서류 및 변경 내역 확인 후 검토를 처리할 수 있습니다.' });
    }

    if (approvalStatus === 'APPROVED' && !hasRequiredBusinessReviewDocuments(profile)) {
      return res.status(400).json({ message: '사업자등록증과 영업허가증 첨부 서류가 모두 있어야 승인할 수 있습니다.' });
    }

    await adminModel.reviewBusinessApplication(userId, { approvalStatus, rejectionReason, reviewedBy: req.user?.id || null });
    if (approvalStatus === 'APPROVED') {
      await deleteUnreferencedBusinessInfoImages(profile.lastApprovedBusinessInfo, [profile.businessInfo]);
    } else {
      await deleteRejectedBusinessInfoImages(profile.businessInfo, profile.lastApprovedBusinessInfo);
    }
    res.json({ success: true, message: approvalStatus === 'APPROVED' ? '기업회원 신청/변경을 승인했습니다.' : '기업회원 신청/변경을 반려했습니다.' });
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const rows = await adminModel.listUsers();
    const content = rows.map((user) => ({
      ...user,
      isCurrentUser: Number(user.id) === Number(req.user.id)
    }));
    res.json({ content, totalElements: content.length });
  } catch (error) {
    next(error);
  }
});

router.get('/admins', async (req, res, next) => {
  try {
    const rows = await adminModel.listAdmins();
    const content = rows.map((user) => ({
      ...user,
      isCurrentUser: Number(user.id) === Number(req.user.id)
    }));
    res.json({ content, totalElements: content.length });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 회원 ID입니다.' });

    const user = await adminModel.getUserDetail(id);
    if (!user || !isManagedUserAccount(user)) return res.status(404).json({ message: '회원을 찾을 수 없습니다.' });

    const activity = await adminModel.getUserActivityOverview(id, { limit: 1000 });

    res.json({
      user: {
        ...user,
        isCurrentUser: Number(user.id) === Number(req.user.id)
      },
      activity
    });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 회원 ID입니다.' });

    const target = await adminModel.findUserById(id);
    if (!target || !isManagedUserAccount(target)) return res.status(404).json({ message: '회원을 찾을 수 없습니다.' });

    const nickname = String(req.body?.nickname || '').trim();
    const password = String(req.body?.password || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const role = String(req.body?.role || '').toUpperCase();
    const memberType = String(req.body?.memberType || '').toUpperCase();
    const businessApprovalStatus = String(req.body?.businessApprovalStatus || '').toUpperCase();
    const businessRejectionReason = String(req.body?.businessRejectionReason || '').trim();
    const pointAdjustmentType = String(req.body?.pointAdjustmentType || 'NONE').toUpperCase();
    const pointAdjustmentAmount = Number(req.body?.pointAdjustmentAmount || 0);
    const pointAdjustmentReason = String(req.body?.pointAdjustmentReason || '').trim();
    const smsConsent = Boolean(req.body?.smsConsent);
    const accountStatus = String(req.body?.accountStatus || LOGIN_STATUS.ACTIVE).toUpperCase();
    const isLoginRestrictionPermanent = Boolean(req.body?.isLoginRestrictionPermanent);
    const loginRestrictionDaysRaw = req.body?.loginRestrictionDays;
    const hasLoginRestrictionDays = loginRestrictionDaysRaw !== undefined && loginRestrictionDaysRaw !== null && String(loginRestrictionDaysRaw).trim() !== '';
    const loginRestrictionDays = hasLoginRestrictionDays ? Number(loginRestrictionDaysRaw) : null;

    const nicknameValidation = validateNickname(nickname);
    if (!nicknameValidation.valid) {
      return res.status(400).json({ message: nicknameValidation.message });
    }

    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
      }
    }

    if (phone && !/^01\d-\d{3,4}-\d{4}$/.test(phone)) {
      return res.status(400).json({ message: '연락처 형식은 010-0000-0000으로 입력해 주세요.' });
    }

    if (!['MEMBER', 'BUSINESS', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: '유효하지 않은 권한입니다.' });
    }

    const isMasterAdmin = isMasterAdminUser(req.user);
    if (role === 'ADMIN' && !isMasterAdmin) {
      return res.status(403).json({ message: '마스터 관리자만 관리자 권한을 부여할 수 있습니다.' });
    }

    if (!['MEMBER', 'BUSINESS'].includes(memberType)) {
      return res.status(400).json({ message: '유효하지 않은 회원 구분입니다.' });
    }

    if (businessApprovalStatus && !['PENDING', 'APPROVED', 'REJECTED'].includes(businessApprovalStatus)) {
      return res.status(400).json({ message: '유효하지 않은 기업회원 신청 상태입니다.' });
    }

    if (businessApprovalStatus === 'REJECTED' && (!businessRejectionReason || businessRejectionReason.length > 500)) {
      return res.status(400).json({ message: '기업회원 신청/변경 반려 사유는 1자 이상 500자 이하로 입력해주세요.' });
    }

    if (!['NONE', 'ADD', 'DEDUCT'].includes(pointAdjustmentType)) {
      return res.status(400).json({ message: '유효하지 않은 포인트 처리 유형입니다.' });
    }

    if (!Number.isInteger(pointAdjustmentAmount) || pointAdjustmentAmount < 0) {
      return res.status(400).json({ message: '포인트 처리 수량은 0 이상의 정수만 입력할 수 있습니다.' });
    }

    if (pointAdjustmentType !== 'NONE' && pointAdjustmentAmount < 1) {
      return res.status(400).json({ message: '포인트를 적립/차감하려면 수량을 1 이상 입력해주세요.' });
    }

    if (pointAdjustmentType === 'NONE' && pointAdjustmentAmount > 0) {
      return res.status(400).json({ message: '포인트 처리 유형을 선택해주세요.' });
    }

    if (pointAdjustmentType !== 'NONE' && (!pointAdjustmentReason || pointAdjustmentReason.length > 255)) {
      return res.status(400).json({ message: '지급 사유는 1자 이상 255자 이하로 입력해주세요.' });
    }

    if (![LOGIN_STATUS.ACTIVE, LOGIN_STATUS.SUSPENDED].includes(accountStatus)) {
      return res.status(400).json({ message: '유효하지 않은 계정 상태입니다.' });
    }

    if (accountStatus === LOGIN_STATUS.SUSPENDED && !isLoginRestrictionPermanent) {
      if (!Number.isFinite(loginRestrictionDays) || loginRestrictionDays < 1 || !Number.isInteger(loginRestrictionDays)) {
        return res.status(400).json({ message: '로그인 제한 일수는 1일 이상의 정수만 입력할 수 있습니다.' });
      }
    }

    const duplicateNickname = await findByNicknameExceptUser(nickname, id);
    if (duplicateNickname) {
      return res.status(400).json({ message: '이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.' });
    }

    const effectiveMemberType = businessApprovalStatus === 'APPROVED'
      ? 'BUSINESS'
      : (businessApprovalStatus === 'REJECTED' ? 'MEMBER' : memberType);

    const updates = {
      nickname,
      phone,
      sms_consent: smsConsent,
      role,
      member_type: effectiveMemberType,
      account_status: accountStatus,
      login_restricted_until: accountStatus === LOGIN_STATUS.SUSPENDED && !isLoginRestrictionPermanent
        ? new Date(Date.now() + loginRestrictionDays * 24 * 60 * 60 * 1000)
        : null,
      is_login_restriction_permanent: accountStatus === LOGIN_STATUS.SUSPENDED && isLoginRestrictionPermanent
    };

    if (password) {
      updates.password = await hashPassword(password);
    }

    const wasBusinessMember = String(target.member_type || target.memberType || '').toUpperCase() === 'BUSINESS';
    if (businessApprovalStatus === 'APPROVED' && !wasBusinessMember) {
      await adminModel.freezeUserCommunityAuthorSnapshotsBeforeBusinessConversion(id);
    }

    await adminModel.updateUserByAdmin(id, updates);
    if (businessApprovalStatus) {
      const previousBusinessProfile = await adminModel.findBusinessApplicationByUserId(id);
      await adminModel.updateBusinessProfileReviewByUserId(id, {
        approvalStatus: businessApprovalStatus,
        rejectionReason: businessRejectionReason,
        reviewedBy: req.user?.id || null
      });
      if (previousBusinessProfile) {
        if (businessApprovalStatus === 'APPROVED') {
          await deleteUnreferencedBusinessInfoImages(previousBusinessProfile.lastApprovedBusinessInfo, [previousBusinessProfile.businessInfo]);
        } else if (businessApprovalStatus === 'REJECTED') {
          await deleteRejectedBusinessInfoImages(previousBusinessProfile.businessInfo, previousBusinessProfile.lastApprovedBusinessInfo);
        }
      }
    }
    if (pointAdjustmentType !== 'NONE' && pointAdjustmentAmount > 0) {
      await adminModel.adjustUserPointsByAdmin(id, {
        amount: pointAdjustmentAmount,
        reason: pointAdjustmentReason,
        actionType: pointAdjustmentType === 'ADD' ? 'ADMIN_ADJUST_ADD' : 'ADMIN_ADJUST_DEDUCT'
      });
    }
    const updatedUser = await adminModel.getUserDetail(id);

    res.json({
      success: true,
      message: '회원 정보가 저장되었습니다.',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const role = String(req.body?.role || '').toUpperCase();
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 회원 ID입니다.' });
    if (!['MEMBER', 'ADMIN'].includes(role)) return res.status(400).json({ message: '유효하지 않은 권한입니다.' });
    if (!isMasterAdminUser(req.user)) {
      return res.status(403).json({ message: '마스터 관리자만 관리자 권한을 변경할 수 있습니다.' });
    }

    const target = await adminModel.findUserById(id);
    if (!target) return res.status(404).json({ message: '회원을 찾을 수 없습니다.' });
    if (String(target.login_id || '').trim().toLowerCase() === 'master' && role !== 'ADMIN') {
      return res.status(400).json({ message: '마스터 관리자 권한은 해지할 수 없습니다.' });
    }

    await adminModel.updateUserRole(id, role);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});


router.patch('/users/:id/member-type', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const memberType = String(req.body?.memberType || '').toUpperCase();
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 회원 ID입니다.' });
    if (!['MEMBER', 'BUSINESS'].includes(memberType)) return res.status(400).json({ message: '유효하지 않은 회원 구분입니다.' });

    const target = await adminModel.findUserById(id);
    if (!target || !isManagedUserAccount(target)) return res.status(404).json({ message: '회원을 찾을 수 없습니다.' });

    await adminModel.updateUserMemberType(id, memberType);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 회원 ID입니다.' });
    if (id === Number(req.user.id)) return res.status(400).json({ message: '현재 로그인한 계정은 삭제할 수 없습니다.' });

    const target = await adminModel.findUserById(id);
    if (!target || !isManagedUserAccount(target)) return res.status(404).json({ message: '회원을 찾을 수 없습니다.' });

    const [businessProfile, businessAds] = await Promise.all([
      adminModel.findBusinessApplicationByUserId(id),
      adminModel.listBusinessAdsByOwner(id)
    ]);

    await adminModel.deleteUser(id);
    await deleteS3ObjectsByUrls([
      ...collectBusinessInfoImageUrls(businessProfile?.businessInfo, businessProfile?.lastApprovedBusinessInfo),
      ...businessAds.map((ad) => ad.imageUrl).filter(Boolean)
    ]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/ads', async (req, res, next) => {
  try {
    const rows = await adminModel.listAds();
    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
});

router.post('/ads', async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim();
    const imageUrl = String(req.body?.imageUrl || '').trim();
    const linkUrl = String(req.body?.linkUrl || '').trim();
    const adType = String(req.body?.adType || 'LIVE').trim().toUpperCase();
    const storeNoRaw = req.body?.storeNo;
    const storeNo = storeNoRaw == null || storeNoRaw === '' ? null : Number.parseInt(storeNoRaw, 10);
    const displayOrder = Number(req.body?.displayOrder) || 0;
    const isActive = Boolean(req.body?.isActive);

    if (!['LIVE', 'TOP'].includes(adType)) {
      return res.status(400).json({ message: '유효하지 않은 광고 유형입니다.' });
    }

    if (adType === 'LIVE' && (!Number.isInteger(storeNo) || storeNo <= 0)) {
      return res.status(400).json({ message: 'LIVE 광고는 매장 번호(storeNo)가 필요합니다.' });
    }

    if (Number.isInteger(storeNo) && storeNo > 0) {
      const store = await adminModel.getStoreByNo(storeNo);
      if (!store) return res.status(404).json({ message: '매장을 찾을 수 없습니다.' });
    }

    if (!title || !imageUrl || !linkUrl) {
      return res.status(400).json({ message: '제목, 이미지 URL, 링크 URL은 필수입니다.' });
    }

    const insertId = await adminModel.createAd({ title, imageUrl, linkUrl, adType, storeNo, displayOrder, isActive });
    res.status(201).json({ id: insertId });
  } catch (error) {
    next(error);
  }
});

router.put('/ads/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 광고 ID입니다.' });

    const target = await adminModel.findAdById(id);
    if (!target) return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });

    const title = String(req.body?.title || '').trim();
    const imageUrl = String(req.body?.imageUrl || '').trim();
    const linkUrl = String(req.body?.linkUrl || '').trim();
    const adType = String(req.body?.adType || 'LIVE').trim().toUpperCase();
    const storeNoRaw = req.body?.storeNo;
    const storeNo = storeNoRaw == null || storeNoRaw === '' ? null : Number.parseInt(storeNoRaw, 10);
    const displayOrder = Number(req.body?.displayOrder) || 0;
    const isActive = Boolean(req.body?.isActive);

    if (!['LIVE', 'TOP'].includes(adType)) {
      return res.status(400).json({ message: '유효하지 않은 광고 유형입니다.' });
    }

    if (adType === 'LIVE' && (!Number.isInteger(storeNo) || storeNo <= 0)) {
      return res.status(400).json({ message: 'LIVE 광고는 매장 번호(storeNo)가 필요합니다.' });
    }

    if (Number.isInteger(storeNo) && storeNo > 0) {
      const store = await adminModel.getStoreByNo(storeNo);
      if (!store) return res.status(404).json({ message: '매장을 찾을 수 없습니다.' });
    }

    if (!title || !imageUrl || !linkUrl) {
      return res.status(400).json({ message: '제목, 이미지 URL, 링크 URL은 필수입니다.' });
    }

    await adminModel.updateAd(id, { title, imageUrl, linkUrl, adType, storeNo, displayOrder, isActive });
    if (target.imageUrl && target.imageUrl !== imageUrl) {
      await deleteS3ObjectByUrl(target.imageUrl);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});


router.get('/business-ads', async (req, res, next) => {
  try {
    const ads = await adminModel.listBusinessAdsForAdmin();
    res.json({ content: ads, totalElements: ads.length });
  } catch (error) {
    next(error);
  }
});

function readBusinessAdPayload(body = {}, fallback = {}) {
  const useStampEvent = Boolean(body.useStampEvent);
  return {
    ownerUserId: Number.parseInt(body.ownerUserId ?? fallback.ownerUserId, 10),
    businessName: String(body.businessName ?? fallback.businessName ?? '').trim(),
    managerName: String(body.managerName ?? fallback.managerName ?? '').trim(),
    managerContact: String(body.managerContact ?? fallback.managerContact ?? '').trim(),
    title: String(body.title ?? fallback.title ?? '').trim(),
    imageUrl: String(body.imageUrl ?? fallback.imageUrl ?? '').trim(),
    linkUrl: String(body.linkUrl ?? fallback.linkUrl ?? '#').trim() || '#',
    region: String(body.region ?? fallback.region ?? '').trim(),
    district: String(body.district ?? fallback.district ?? '').trim(),
    category: String(body.category ?? fallback.category ?? '').trim(),
    openHour: String(body.openHour ?? fallback.openHour ?? '').trim(),
    closeHour: String(body.closeHour ?? fallback.closeHour ?? '').trim(),
    description: String(body.description ?? fallback.description ?? '').trim(),
    kakaoTalkId: String(body.kakaoTalkId ?? fallback.kakaoTalkId ?? '').trim(),
    telegramId: String(body.telegramId ?? fallback.telegramId ?? '').trim(),
    showBusinessAddressMap: Boolean(body.showBusinessAddressMap),
    useVisitVerification: useStampEvent,
    useStampEvent,
    stampEventDescription: useStampEvent ? String(body.stampEventDescription ?? fallback.stampEventDescription ?? '').trim() : '',
    stampEventCount: useStampEvent ? (Number.parseInt(body.stampEventCount, 10) || 0) : 0,
    planType: String(body.planType ?? fallback.planType ?? 'BASIC').trim().toUpperCase(),
    registrationStatus: String(body.registrationStatus ?? fallback.registrationStatus ?? 'UNREGISTERED').trim().toUpperCase(),
    displayOrder: Number(body.displayOrder ?? fallback.displayOrder) || 0,
    isActive: Boolean(body.isActive)
  };
}

function validateBusinessAdPayload(payload, { requireOwner = true } = {}) {
  if (requireOwner && (!Number.isInteger(payload.ownerUserId) || payload.ownerUserId <= 0)) return '소유 회원 ID가 필요합니다.';
  if (!payload.title || !payload.imageUrl) return '광고 제목과 대표 이미지 URL은 필수입니다.';
  if (!['UNREGISTERED', 'DRAFT', 'REGISTERED'].includes(payload.registrationStatus)) return '유효하지 않은 등록 상태입니다.';
  if (payload.linkUrl !== '#') {
    try {
      const parsed = new URL(payload.linkUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) return '광고 링크 URL은 http:// 또는 https:// 형식이어야 합니다.';
    } catch (error) {
      return '광고 링크 URL은 http:// 또는 https:// 형식이어야 합니다.';
    }
  }
  if (payload.useStampEvent && (!payload.stampEventDescription || payload.stampEventCount <= 0)) return '스탬프 이벤트 사용 시 설명과 사용 개수를 입력하세요.';
  return '';
}

router.post('/business-ads', async (req, res, next) => {
  try {
    const payload = readBusinessAdPayload(req.body);
    const errorMessage = validateBusinessAdPayload(payload);
    if (errorMessage) return res.status(400).json({ message: errorMessage });
    const insertId = await adminModel.createBusinessAd(payload);
    res.status(201).json({ id: insertId });
  } catch (error) {
    next(error);
  }
});

router.put('/business-ads/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 업체 광고 ID입니다.' });
    const target = await adminModel.findBusinessAdById(id);
    if (!target) return res.status(404).json({ message: '업체 광고를 찾을 수 없습니다.' });
    const payload = readBusinessAdPayload(req.body, target);
    const errorMessage = validateBusinessAdPayload(payload, { requireOwner: false });
    if (errorMessage) return res.status(400).json({ message: errorMessage });
    await adminModel.updateBusinessAd(id, payload);
    if (target.imageUrl && target.imageUrl !== payload.imageUrl) await deleteS3ObjectByUrl(target.imageUrl);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/business-ads/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 업체 광고 ID입니다.' });
    const target = await adminModel.findBusinessAdById(id);
    if (!target) return res.status(404).json({ message: '업체 광고를 찾을 수 없습니다.' });
    await adminModel.deleteBusinessAd(id);
    if (target.imageUrl) await deleteS3ObjectByUrl(target.imageUrl);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/ads/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 광고 ID입니다.' });

    const target = await adminModel.findAdById(id);
    if (!target) return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });

    await adminModel.deleteAd(id);
    if (target.imageUrl) {
      await deleteS3ObjectByUrl(target.imageUrl);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/entries/stores', async (req, res, next) => {
  try {
    const stores = await adminModel.listEntryStores();
    res.json({ content: stores, totalElements: stores.length });
  } catch (error) {
    next(error);
  }
});

router.get('/entries', async (req, res, next) => {
  try {
    const storeNo = Number.parseInt(req.query.storeNo, 10);
    if (!Number.isInteger(storeNo) || storeNo <= 0) {
      return res.status(400).json({ message: '유효한 매장을 선택해주세요.' });
    }

    const store = await adminModel.getStoreByNo(storeNo);
    if (!store) return res.status(404).json({ message: '매장을 찾을 수 없습니다.' });

    const rows = await adminModel.listEntries(storeNo);
    res.json({
      selectedStore: store,
      content: rows,
      totalElements: rows.length
    });
  } catch (error) {
    next(error);
  }
});

router.post('/entries', async (req, res, next) => {
  try {
    const storeNo = Number.parseInt(req.body?.storeNo, 10);
    const workerName = String(req.body?.workerName || '').trim();

    if (!Number.isInteger(storeNo) || storeNo <= 0) {
      return res.status(400).json({ message: '유효한 매장을 선택해주세요.' });
    }

    if (!workerName || workerName.length < 1) {
      return res.status(400).json({ message: '엔트리 이름을 입력해주세요.' });
    }

    const store = await adminModel.getStoreByNo(storeNo);
    if (!store) return res.status(404).json({ message: '매장을 찾을 수 없습니다.' });

    const duplicate = await adminModel.findEntryByStoreAndName(storeNo, workerName);
    if (duplicate) {
      return res.status(409).json({ message: '같은 매장에 동일한 엔트리 이름이 이미 등록되어 있습니다.' });
    }

    const entry = await adminModel.createEntry({ storeNo, workerName });
    res.status(201).json({ success: true, entry });
  } catch (error) {
    next(error);
  }
});

router.put('/entries/:entryId', async (req, res, next) => {
  try {
    const entryId = String(req.params.entryId || '').trim();
    const workerName = String(req.body?.workerName || '').trim();
    if (!entryId) return res.status(400).json({ message: '유효하지 않은 엔트리 ID입니다.' });
    if (!workerName) return res.status(400).json({ message: '엔트리 이름을 입력해주세요.' });

    const target = await adminModel.findEntryById(entryId);
    if (!target) return res.status(404).json({ message: '엔트리 항목을 찾을 수 없습니다.' });

    if (target.workerName !== workerName) {
      const duplicate = await adminModel.findEntryByStoreAndName(target.storeNo, workerName);
      if (duplicate) {
        return res.status(409).json({ message: '같은 매장에 동일한 엔트리 이름이 이미 등록되어 있습니다.' });
      }
    }

    res.json({
      success: true,
      entry: await adminModel.updateEntry(entryId, { workerName })
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/entries/:entryId', async (req, res, next) => {
  try {
    const entryId = String(req.params.entryId || '').trim();
    if (!entryId) return res.status(400).json({ message: '유효하지 않은 엔트리 ID입니다.' });

    const target = await adminModel.findEntryById(entryId);
    if (!target) return res.status(404).json({ message: '엔트리 항목을 찾을 수 없습니다.' });

    await adminModel.deleteEntry(entryId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/live/chojoong/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: '유효하지 않은 초중 메시지 ID입니다.' });
    }

    const deletedRows = await liveModel.deleteLiveHistoryRow('chojoong', id);
    if (!deletedRows) {
      return res.status(404).json({ message: '삭제할 초중 메시지를 찾을 수 없습니다.' });
    }

    return res.json({ success: true, id });
  } catch (error) {
    return next(error);
  }
});

router.get('/support', supportController.listAdminArticles);
router.get('/support/article/:id', supportController.getAdminArticleDetail);
router.get('/support/inquiries', supportController.listAdminInquiries);
router.put('/support/inquiries/:id/answer', supportController.answerInquiry);
router.post('/support', supportController.createArticle);
router.put('/support/:id', supportController.updateArticle);
router.delete('/support/:id', supportController.deleteArticle);

module.exports = router;
