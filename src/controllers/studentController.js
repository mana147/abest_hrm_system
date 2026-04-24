const studentModel = require('../models/studentModel');

module.exports = {
  async index(req, res) {
    const { search = '', status = '', page = 1 } = req.query;
    const data = await studentModel.list({ search, status, page });
    res.render('students/index', {
      page: 'students',
      title: res.locals.t('students.title'),
      ...data,
      search,
      filterStatus: status,
    });
  },

  showCreate(req, res) {
    res.render('students/form', {
      page:    'students',
      title:   res.locals.t('students.add'),
      student: null,
      action:  '/students',
    });
  },

  async create(req, res) {
    try {
      if (!req.body.full_name?.trim()) {
        req.flash('error', 'Full name is required');
        return res.redirect('/students/new');
      }
      const id = await studentModel.create(req.body);
      req.flash('success', res.locals.t('students.created') || 'Student created');
      res.redirect(`/students/${id}`);
    } catch (err) {
      console.error('[student.create]', err);
      req.flash('error', err.message);
      res.redirect('/students/new');
    }
  },

  async show(req, res) {
    const student = await studentModel.findById(req.params.id);
    if (!student) return res.status(404).render('error', { layout: false, code: 404, message: 'Student not found' });
    res.render('students/show', {
      page:    'students',
      title:   student.full_name,
      student,
    });
  },

  async showEdit(req, res) {
    const student = await studentModel.findById(req.params.id);
    if (!student) return res.status(404).render('error', { layout: false, code: 404, message: 'Student not found' });
    res.render('students/form', {
      page:    'students',
      title:   `${res.locals.t('common.edit')} — ${student.full_name}`,
      student,
      action:  `/students/${student.id}`,
    });
  },

  async update(req, res) {
    const { id } = req.params;
    try {
      if (!req.body.full_name?.trim()) {
        req.flash('error', 'Full name is required');
        return res.redirect(`/students/${id}/edit`);
      }
      await studentModel.update(id, req.body);
      req.flash('success', res.locals.t('students.updated') || 'Updated');
      res.redirect(`/students/${id}`);
    } catch (err) {
      console.error('[student.update]', err);
      req.flash('error', err.message);
      res.redirect(`/students/${id}/edit`);
    }
  },

  async destroy(req, res) {
    await studentModel.softDelete(req.params.id);
    req.flash('success', res.locals.t('students.deactivated') || 'Student deactivated');
    res.redirect('/students');
  },
};