-- LAB only: protect direct Data API reads of device requests by group.
-- This does not replace filtering inside service_role Edge Functions.
alter policy mathas_requests_teacher_select on public.mathas_device_requests
using (
  (suggested_group_id is not null
   and mathas_private.teacher_can_view_group(suggested_group_id))
  or (linked_student_id is not null
      and mathas_private.teacher_can_view_student(linked_student_id))
);
