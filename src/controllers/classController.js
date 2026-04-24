const classModel       = require('../models/classModel');
const scheduleLineModel = require('../models/scheduleLineModel');
const { isDateInPattern } = require('../utils/scheduling');

module.exports = {
  async index(req, res) {
    const { search = '', status = '', course_id = '', page = 1 } = req.query;
    const [data, opts] = await Promise.all([
      classModel.list({ search, status, courseId: course_id, page }),
      classModel.getFormOptions(),
    ]);
    res.render('classes/index', {
      page:         'classes',
      title:        res.locals.t('classes.title'),
      ...data,
      search,
      filterStatus:   status,
      filterCourseId: course_id,
      courses:        opts.courses,
    });
  },

  async showCreate(req, res) {
    const [opts, preLineId] = [await classModel.getFormOptions(), req.query.line_id];
    let prefill = {};
    if (preLineId) {
      const line = opts.scheduleLines.find(sl => String(sl.id) === String(preLineId));
      if (line) prefill = { line_id: line.id, classroom_id: line.classroom_id, timeslot_id: line.timeslot_id, capacity: line.default_capacity };
    }
    res.render('classes/form', {
      page:    'classes',
      title:   res.locals.t('classes.add'),
      cls:     null,
      action:  '/classes',
      prefill,
      ...opts,
    });
  },

  async create(req, res) {
    try {
      const body = req.body;

      // If a schedule line is selected, override classroom and timeslot from line
      if (body.line_id) {
        const line = await scheduleLineModel.findById(body.line_id);
        if (!line) {
          req.flash('error', 'Đường vận hành không tồn tại');
          return res.redirect('/classes/new');
        }
        body.classroom_id = line.classroom_id;
        body.timeslot_id  = line.timeslot_id;

        // Conflict check — only when line is selected
        const conflict = await classModel.getActiveClassOnLine(body.line_id);
        if (conflict) {
          req.flash('error',
            `Đường vận hành này đang có lớp active: [${conflict.class_code}] ${conflict.class_name}`
          );
          return res.redirect(body.line_id ? `/schedule-lines/${body.line_id}` : '/classes/new');
        }
      }

      // Required field checks
      if (!body.class_name?.trim())  { req.flash('error', 'Tên lớp không được để trống');            return res.redirect('/classes/new'); }
      if (!body.course_id)           { req.flash('error', 'Vui lòng chọn khóa học');                  return res.redirect('/classes/new'); }
      if (!body.classroom_id)        { req.flash('error', 'Vui lòng chọn phòng học');                 return res.redirect('/classes/new'); }
      if (!body.timeslot_id)         { req.flash('error', 'Vui lòng chọn khung giờ');                 return res.redirect('/classes/new'); }
      if (!body.start_date)          { req.flash('error', 'Vui lòng chọn ngày khai giảng');           return res.redirect('/classes/new'); }
      if (!body.total_sessions || parseInt(body.total_sessions) < 1) {
        req.flash('error', 'Số buổi học phải lớn hơn 0');
        return res.redirect('/classes/new');
      }

      // Validate start_date is in weekdays pattern
      const timeslot = await require('../config/db').get(
        `SELECT weekdays_pattern, label FROM timeslots WHERE id = ?`, [body.timeslot_id]
      );
      if (timeslot && !isDateInPattern(body.start_date, timeslot.weekdays_pattern)) {
        req.flash('error',
          `Ngày khai giảng không thuộc lịch học của khung giờ này (${timeslot.label}). Vui lòng chọn đúng thứ trong tuần.`
        );
        return res.redirect('/classes/new');
      }

      const holidaySet = await classModel.getHolidaySet();
      const classId    = await classModel.create(body, holidaySet);

      req.flash('success', res.locals.t('classes.created') || 'Đã tạo lớp học thành công');
      res.redirect(`/classes/${classId}`);
    } catch (err) {
      console.error('[class.create]', err);
      req.flash('error', err.message);
      res.redirect('/classes/new');
    }
  },

  async show(req, res) {
    const [cls, sessions] = await Promise.all([
      classModel.findById(req.params.id),
      classModel.getSessions(req.params.id),
    ]);
    if (!cls) return res.status(404).render('error', { layout: false, code: 404, message: 'Class not found' });

    const validNextStatuses = classModel.VALID_TRANSITIONS[cls.status] || [];
    res.render('classes/show', {
      page:              'classes',
      title:             cls.class_name,
      cls,
      sessions,
      validNextStatuses,
    });
  },

  async showEdit(req, res) {
    const [cls, opts] = await Promise.all([
      classModel.findById(req.params.id),
      classModel.getFormOptions(),
    ]);
    if (!cls) return res.status(404).render('error', { layout: false, code: 404, message: 'Class not found' });
    res.render('classes/form', {
      page:    'classes',
      title:   `${res.locals.t('common.edit')} — ${cls.class_name}`,
      cls,
      action:  `/classes/${cls.id}`,
      prefill: {},
      ...opts,
    });
  },

  async update(req, res) {
    const { id } = req.params;
    try {
      if (!req.body.class_name?.trim()) {
        req.flash('error', 'Tên lớp không được để trống');
        return res.redirect(`/classes/${id}/edit`);
      }
      await classModel.update(id, req.body);
      req.flash('success', res.locals.t('classes.updated') || 'Đã cập nhật');
      res.redirect(`/classes/${id}`);
    } catch (err) {
      console.error('[class.update]', err);
      req.flash('error', err.message);
      res.redirect(`/classes/${id}/edit`);
    }
  },

  async destroy(req, res) {
    try {
      await classModel.updateStatus(req.params.id, 'cancelled');
      req.flash('success', res.locals.t('classes.cancelled') || 'Đã hủy lớp học');
    } catch (err) {
      req.flash('error', err.message);
    }
    res.redirect('/classes');
  },

  async updateStatus(req, res) {
    const { id } = req.params;
    const { newStatus } = req.body;
    try {
      await classModel.updateStatus(id, newStatus);
      req.flash('success', res.locals.t('classes.status_updated') || 'Đã cập nhật trạng thái lớp');
    } catch (err) {
      req.flash('error', err.message);
    }
    res.redirect(`/classes/${id}`);
  },

  async updateSession(req, res) {
    const { id, sessionId } = req.params;
    const { status, note } = req.body;
    try {
      await classModel.updateSession(sessionId, { status, note });
      req.flash('success', res.locals.t('classes.session_updated') || 'Đã cập nhật buổi học');
    } catch (err) {
      req.flash('error', err.message);
    }
    res.redirect(`/classes/${id}#sessions`);
  },
};
