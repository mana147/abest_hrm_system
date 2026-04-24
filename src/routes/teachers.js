const express     = require('express');
const router      = express.Router();
const ctrl        = require('../controllers/teacherController');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

router.get('/',            ctrl.index);
router.get('/new',         ctrl.showCreate);
router.post('/',           ctrl.create);
router.get('/:id',         ctrl.show);
router.get('/:id/edit',    ctrl.showEdit);
router.post('/:id',        ctrl.update);
router.post('/:id/delete', ctrl.destroy);

module.exports = router;
