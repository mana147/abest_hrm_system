const scheduleLineModel = require('../models/scheduleLineModel');

module.exports = {
  async index(req, res) {
    const { search = '', active = '', page = 1 } = req.query;
    const data = await scheduleLineModel.list({ search, active, page });
    res.render('schedule-lines/index', {
      page: 'schedule-lines',
      title: res.locals.t('schedule_lines.title'),
      ...data,
      search,
      filterActive: active,
    });
  },

  async showCreate(req, res) {
    const opts = await scheduleLineModel.getFormOptions();
    res.render('schedule-lines/form', {
      page:  'schedule-lines',
      title: res.locals.t('schedule_lines.add'),
      line:  null,
      action: '/schedule-lines',
      ...opts,
    });
  },

  async create(req, res) {
    try {
      if (!req.body.line_code?.trim()) {
        req.flash('error', 'Mã đường vận hành không được để trống');
        return res.redirect('/schedule-lines/new');
      }
      if (!req.body.line_name?.trim()) {
        req.flash('error', 'Tên đường vận hành không được để trống');
        return res.redirect('/schedule-lines/new');
      }
      if (!req.body.classroom_id || !req.body.timeslot_id) {
        req.flash('error', 'Vui lòng chọn phòng học và khung giờ');
        return res.redirect('/schedule-lines/new');
      }
      const result = await scheduleLineModel.create(req.body);
      req.flash('success', res.locals.t('schedule_lines.created') || 'Đã tạo đường vận hành');
      res.redirect(`/schedule-lines/${result.insertId}`);
    } catch (err) {
      console.error('[scheduleLine.create]', err);
      if (err.code === 'ER_DUP_ENTRY') {
        req.flash('error', 'Cặp phòng học + khung giờ này đã tồn tại. Vui lòng chọn khác.');
      } else {
        req.flash('error', err.message);
      }
      res.redirect('/schedule-lines/new');
    }
  },

  async show(req, res) {
    const line = await scheduleLineModel.findById(req.params.id);
    if (!line) return res.status(404).render('error', { layout: false, code: 404, message: 'Schedule line not found' });
    const activeClass = await scheduleLineModel.getActiveClass(line.id);
    res.render('schedule-lines/show', {
      page:  'schedule-lines',
      title: line.line_name,
      line,
      activeClass,
    });
  },

  async showEdit(req, res) {
    const [line, opts] = await Promise.all([
      scheduleLineModel.findById(req.params.id),
      scheduleLineModel.getFormOptions(),
    ]);
    if (!line) return res.status(404).render('error', { layout: false, code: 404, message: 'Schedule line not found' });
    res.render('schedule-lines/form', {
      page:   'schedule-lines',
      title:  `${res.locals.t('common.edit')} — ${line.line_name}`,
      line,
      action: `/schedule-lines/${line.id}`,
      ...opts,
    });
  },

  async update(req, res) {
    const { id } = req.params;
    try {
      if (!req.body.line_code?.trim()) {
        req.flash('error', 'Mã đường vận hành không được để trống');
        return res.redirect(`/schedule-lines/${id}/edit`);
      }
      if (!req.body.classroom_id || !req.body.timeslot_id) {
        req.flash('error', 'Vui lòng chọn phòng học và khung giờ');
        return res.redirect(`/schedule-lines/${id}/edit`);
      }
      await scheduleLineModel.update(id, req.body);
      req.flash('success', res.locals.t('schedule_lines.updated') || 'Đã cập nhật');
      res.redirect(`/schedule-lines/${id}`);
    } catch (err) {
      console.error('[scheduleLine.update]', err);
      if (err.code === 'ER_DUP_ENTRY') {
        req.flash('error', 'Cặp phòng học + khung giờ này đã tồn tại. Vui lòng chọn khác.');
      } else {
        req.flash('error', err.message);
      }
      res.redirect(`/schedule-lines/${id}/edit`);
    }
  },

  async destroy(req, res) {
    await scheduleLineModel.deactivate(req.params.id);
    req.flash('success', res.locals.t('schedule_lines.deactivated') || 'Đã đóng đường vận hành');
    res.redirect('/schedule-lines');
  },
};
