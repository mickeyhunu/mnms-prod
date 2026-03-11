const express = require('express');
const controller = require('../controllers/postController');
const { optionalAuthMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', controller.listPosts);
router.get('/:id', optionalAuthMiddleware, controller.getPost);
router.post('/', optionalAuthMiddleware, controller.createPost);
router.put('/:id', optionalAuthMiddleware, controller.updatePost);
router.delete('/:id', optionalAuthMiddleware, controller.deletePost);
router.get('/:postId/comments', optionalAuthMiddleware, controller.listComments);
router.post('/:postId/comments', optionalAuthMiddleware, controller.createComment);

module.exports = router;
