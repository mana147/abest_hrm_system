const timeslotModel = require('../models/timeslotModel');

module.exports = {
  async index(req, res) {
    const { search = '', status = '', page = 1 } = req.query;
    const data = await timeslotModel.list({ search, status, page });
    res.render('timeslots/index', {
      page: 'timeslots',
      title: res.locals.t('timeslots.title'),
      ...data,
      search,
      filterStatus: status,
    });
  },

  showCreate(req, res) {
    res.render('timeslots/form', {
      page:     'timeslots',
      title:    res.locals.t('timeslots.add'),
      timeslot: null,
      action:   '/timeslots',
    });
  },

  async create(req, res) {
    try {
      if (!req.body.timeslot_code?.trim()) {
        req.flash('error', 'Mã khung giờ không được để trống');
        return res.redirect('/timeslots/new');
      }
      if (!req.body.label?.trim()) {
        req.flash('error', 'Nhãn khung giờ không được để trống');
        return res.redirect('/timeslots/new');
      }
      if (!req.body.weekdays || (Array.isArray(req.body.weekdays) && req.body.weekdays.length === 0)) {
        req.flash('error', 'Vui lòng chọn ít nhất một ngày trong tuần');
        return res.redirect('/timeslots/new');
      }
      const result = await timeslotModel.create(req.body);
      req.flash('success', res.locals.t('timeslots.created') || 'Đã tạo khung giờ');
      res.redirect(`/timeslots/${result.insertId}`);
    } catch (err) {
      console.error('[timeslot.create]', err);
      req.flash('error', err.message);
      res.redirect('/timeslots/new');
    }
  },

  async show(req, res) {
    const timeslot = await timeslotModel.findById(req.params.id);
    if (!timeslot) return res.status(404).render('error', { layout: false, code: 404, message: 'Timeslot not found' });
    res.render('timeslots/show', {
      page:     'timeslots',
      title:    timeslot.label,
      timeslot,
    });
  },

  async showEdit(req, res) {
    const timeslot = await timeslotModel.findById(req.params.id);
    if (!timeslot) return res.status(404).render('error', { layout: false, code: 404, message: 'Timeslot not found' });
    res.render('timeslots/form', {
      page:     'timeslots',
      title:    `${res.locals.t('common.edit')} — ${timeslot.label}`,
      timeslot,
      action:   `/timeslots/${timeslot.id}`,
    });
  },

  async update(req, res) {
    const { id } = req.params;
    try {
      if (!req.body.timeslot_code?.trim()) {
        req.flash('error', 'Mã khung giờ không được để trống');
        return res.redirect(`/timeslots/${id}/edit`);
      }
      if (!req.body.weekdays || (Array.isArray(req.body.weekdays) && req.body.weekdays.length === 0)) {
        req.flash('error', 'Vui lòng chọn ít nhất một ngày trong tuần');
        return res.redirect(`/timeslots/${id}/edit`);
      }
      await timeslotModel.update(id, req.body);
      req.flash('success', res.locals.t('timeslots.updated') || 'Đã cập nhật');
      res.redirect(`/timeslots/${id}`);
    } catch (err) {
      console.error('[timeslot.update]', err);
      req.flash('error', err.message);
      res.redirect(`/timeslots/${id}/edit`);
    }
  },

  async destroy(req, res) {
    await timeslotModel.softDelete(req.params.id);
    req.flash('success', res.locals.t('timeslots.deactivated') || 'Đã ngừng khung giờ');
    res.redirect('/timeslots');
  },
};
