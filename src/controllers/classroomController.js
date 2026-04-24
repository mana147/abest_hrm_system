const classroomModel = require('../models/classroomModel');

const ROOM_TYPES = ['classroom', 'lab', 'meeting_room'];

module.exports = {
  async index(req, res) {
    const { search = '', room_type = '', status = '', page = 1 } = req.query;
    const data = await classroomModel.list({ search, roomType: room_type, status, page });
    res.render('classrooms/index', {
      page: 'classrooms',
      title: res.locals.t('classrooms.title'),
      ...data,
      search,
      filterRoomType: room_type,
      filterStatus: status,
      roomTypes: ROOM_TYPES,
    });
  },

  async showCreate(req, res) {
    const branches = await classroomModel.getBranches();
    res.render('classrooms/form', {
      page:      'classrooms',
      title:     res.locals.t('classrooms.add'),
      classroom: null,
      action:    '/classrooms',
      branches,
      roomTypes: ROOM_TYPES,
    });
  },

  async create(req, res) {
    try {
      if (!req.body.room_name?.trim()) {
        req.flash('error', 'Tên phòng không được để trống');
        return res.redirect('/classrooms/new');
      }
      if (!req.body.room_code?.trim()) {
        req.flash('error', 'Mã phòng không được để trống');
        return res.redirect('/classrooms/new');
      }
      const result = await classroomModel.create(req.body);
      req.flash('success', res.locals.t('classrooms.created') || 'Đã tạo phòng học');
      res.redirect(`/classrooms/${result.insertId}`);
    } catch (err) {
      console.error('[classroom.create]', err);
      req.flash('error', err.message);
      res.redirect('/classrooms/new');
    }
  },

  async show(req, res) {
    const classroom = await classroomModel.findById(req.params.id);
    if (!classroom) return res.status(404).render('error', { layout: false, code: 404, message: 'Classroom not found' });
    res.render('classrooms/show', {
      page:      'classrooms',
      title:     classroom.room_name,
      classroom,
    });
  },

  async showEdit(req, res) {
    const [classroom, branches] = await Promise.all([
      classroomModel.findById(req.params.id),
      classroomModel.getBranches(),
    ]);
    if (!classroom) return res.status(404).render('error', { layout: false, code: 404, message: 'Classroom not found' });
    res.render('classrooms/form', {
      page:      'classrooms',
      title:     `${res.locals.t('common.edit')} — ${classroom.room_name}`,
      classroom,
      action:    `/classrooms/${classroom.id}`,
      branches,
      roomTypes: ROOM_TYPES,
    });
  },

  async update(req, res) {
    const { id } = req.params;
    try {
      if (!req.body.room_name?.trim()) {
        req.flash('error', 'Tên phòng không được để trống');
        return res.redirect(`/classrooms/${id}/edit`);
      }
      if (!req.body.room_code?.trim()) {
        req.flash('error', 'Mã phòng không được để trống');
        return res.redirect(`/classrooms/${id}/edit`);
      }
      await classroomModel.update(id, req.body);
      req.flash('success', res.locals.t('classrooms.updated') || 'Đã cập nhật');
      res.redirect(`/classrooms/${id}`);
    } catch (err) {
      console.error('[classroom.update]', err);
      req.flash('error', err.message);
      res.redirect(`/classrooms/${id}/edit`);
    }
  },

  async destroy(req, res) {
    await classroomModel.softDelete(req.params.id);
    req.flash('success', res.locals.t('classrooms.deactivated') || 'Đã ngừng phòng học');
    res.redirect('/classrooms');
  },
};
