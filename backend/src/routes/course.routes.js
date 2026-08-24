const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createCourseSchema, updateCourseSchema } = require('../validators/course.validator');
const { ROLES } = require('../constants/roles');

router.use(authenticateToken);

router.get('/', courseController.getCourses);
router.get('/:id', courseController.getCourseById);
router.post('/', authorizeRoles(ROLES.ADMIN), validate(createCourseSchema), courseController.createCourse);
router.patch('/:id', authorizeRoles(ROLES.ADMIN), validate(updateCourseSchema), courseController.updateCourse);
router.delete('/:id', authorizeRoles(ROLES.ADMIN), courseController.deleteCourse);

module.exports = router;
