const courseModel = require('../models/courseModel');

const LEVELS = ['beginner','elementary','pre_intermediate','intermediate','upper_intermediate','advanced'];

module.exports = {
  async index(req, res) {
    const { search = '', level = '', status = '', page = 1 } = req.query;
    const data = await courseModel.list({ search, level, status, page });
    res.render('courses/index', {
      page: 'courses',
      title: res.locals.t('courses.title'),
      ...data,
      search,
      filterLevel: level,
      filterStatus: status,
      levels: LEVELS,
    });
  },

  showCreate(req, res) {
    res.render('courses/form', {
      page:   'courses',
      title:  res.locals.t('courses.add'),
      course: null,
      action: '/courses',
      levels: LEVELS,
    });
  },

  async create(req, res) {
    try {
      if (!req.body.course_name?.trim()) {
        req.flash('error', 'Tên khóa học không được để trống');
        return res.redirect('/courses/new');
      }
      if (!req.body.course_code?.trim()) {
        req.flash('error', 'Mã khóa học không được để trống');
        return res.redirect('/courses/new');
      }
      const result = await courseModel.create(req.body);
      req.flash('success', res.locals.t('courses.created') || 'Đã tạo khóa học');
      res.redirect(`/courses/${result.insertId}`);
    } catch (err) {
      console.error('[course.create]', err);
      req.flash('error', err.message);
      res.redirect('/courses/new');
    }
  },

  async show(req, res) {
    const course = await courseModel.findById(req.params.id);
    if (!course) return res.status(404).render('error', { layout: false, code: 404, message: 'Course not found' });
    res.render('courses/show', {
      page:  'courses',
      title: course.course_name,
      course,
    });
  },

  async showEdit(req, res) {
    const course = await courseModel.findById(req.params.id);
    if (!course) return res.status(404).render('error', { layout: false, code: 404, message: 'Course not found' });
    res.render('courses/form', {
      page:   'courses',
      title:  `${res.locals.t('common.edit')} — ${course.course_name}`,
      course,
      action: `/courses/${course.id}`,
      levels: LEVELS,
    });
  },

  async update(req, res) {
    const { id } = req.params;
    try {
      if (!req.body.course_name?.trim()) {
        req.flash('error', 'Tên khóa học không được để trống');
        return res.redirect(`/courses/${id}/edit`);
      }
      if (!req.body.course_code?.trim()) {
        req.flash('error', 'Mã khóa học không được để trống');
        return res.redirect(`/courses/${id}/edit`);
      }
      await courseModel.update(id, req.body);
      req.flash('success', res.locals.t('courses.updated') || 'Đã cập nhật');
      res.redirect(`/courses/${id}`);
    } catch (err) {
      console.error('[course.update]', err);
      req.flash('error', err.message);
      res.redirect(`/courses/${id}/edit`);
    }
  },

  async destroy(req, res) {
    await courseModel.softDelete(req.params.id);
    req.flash('success', res.locals.t('courses.deactivated') || 'Đã ngừng khóa học');
    res.redirect('/courses');
  },
};
