const teacherModel = require('../models/teacherModel');

module.exports = {
  async index(req, res) {
    const { search = '', status = '', type = '', page = 1 } = req.query;
    const data = await teacherModel.list({ search, status, type, page });
    res.render('teachers/index', {
      page: 'teachers',
      title: res.locals.t('teachers.title'),
      ...data,
      search,
      filterStatus: status,
      filterType:   type,
    });
  },

  showCreate(req, res) {
    res.render('teachers/form', {
      page:    'teachers',
      title:   res.locals.t('teachers.add'),
      teacher: null,
      action:  '/teachers',
    });
  },

  async create(req, res) {
    try {
      if (!req.body.full_name?.trim()) {
        req.flash('error', 'Full name is required');
        return res.redirect('/teachers/new');
      }
      const id = await teacherModel.create(req.body);
      req.flash('success', res.locals.t('teachers.created') || 'Teacher created');
      res.redirect(`/teachers/${id}`);
    } catch (err) {
      console.error('[teacher.create]', err);
      req.flash('error', err.message);
      res.redirect('/teachers/new');
    }
  },

  async show(req, res) {
    const teacher = await teacherModel.findById(req.params.id);
    if (!teacher) return res.status(404).render('error', { layout: false, code: 404, message: 'Teacher not found' });
    res.render('teachers/show', {
      page:    'teachers',
      title:   teacher.full_name,
      teacher,
    });
  },

  async showEdit(req, res) {
    const teacher = await teacherModel.findById(req.params.id);
    if (!teacher) return res.status(404).render('error', { layout: false, code: 404, message: 'Teacher not found' });
    res.render('teachers/form', {
      page:    'teachers',
      title:   `${res.locals.t('common.edit')} — ${teacher.full_name}`,
      teacher,
      action:  `/teachers/${teacher.id}`,
    });
  },

  async update(req, res) {
    const { id } = req.params;
    try {
      if (!req.body.full_name?.trim()) {
        req.flash('error', 'Full name is required');
        return res.redirect(`/teachers/${id}/edit`);
      }
      await teacherModel.update(id, req.body);
      req.flash('success', res.locals.t('teachers.updated') || 'Updated');
      res.redirect(`/teachers/${id}`);
    } catch (err) {
      console.error('[teacher.update]', err);
      req.flash('error', err.message);
      res.redirect(`/teachers/${id}/edit`);
    }
  },

  async destroy(req, res) {
    await teacherModel.softDelete(req.params.id);
    req.flash('success', res.locals.t('teachers.deactivated') || 'Teacher deactivated');
    res.redirect('/teachers');
  },
};
