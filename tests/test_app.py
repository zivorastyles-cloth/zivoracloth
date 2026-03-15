import os
import tempfile

import app as store_app


def setup_test_db(path):
    store_app.DB_PATH = path
    store_app.init_db()


def test_admin_login_and_create_reseller():
    fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    try:
        setup_test_db(db_path)
        store_app.app.config['TESTING'] = True
        client = store_app.app.test_client()

        resp = client.post('/login', data={'username': 'admin', 'password': 'admin123'}, follow_redirects=True)
        assert b'Admin Dashboard' in resp.data

        resp = client.post('/admin/users/create', data={'username': 'r1', 'password': 'p1'}, follow_redirects=True)
        assert b'Reseller created' in resp.data
    finally:
        if os.path.exists(db_path):
            os.remove(db_path)
