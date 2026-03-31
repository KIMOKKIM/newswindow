## SIGNUP_CONNECTIVITY_RECOVERY

Date: 2026-03-30

After BACKEND_URL is set, verify signup connectivity:

1) Duplicate check call
- URL: GET https://newswindow.kr/api/users/check?userid=<userid>
- Expect: 200 { available: true/false }

2) Signup call
- URL: POST https://newswindow.kr/api/auth/signup
- Body: { userid, password, name, email, role }
- Expect: 201 or 400 for validation errors

3) If calls return 404/502 prior to BACKEND_URL set: root cause is proxy missing backend target.

