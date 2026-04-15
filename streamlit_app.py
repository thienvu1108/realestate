import streamlit as st
from streamlit_oauth import OAuth2Component
import google.generativeai as genai

# 1. Thông tin cấu hình từ Secrets
CLIENT_ID = st.secrets["CLIENT_ID"]
CLIENT_SECRET = st.secrets["CLIENT_SECRET"]
AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
REFRESH_TOKEN_URL = "https://oauth2.googleapis.com/token"
REVOKE_TOKEN_URL = "https://oauth2.googleapis.com/revoke"

st.set_page_config(page_title="Real Estate AI")
st.title("🏠 Ứng dụng Bất động sản AI")

# 2. Thiết lập bộ máy đăng nhập
oauth2 = OAuth2Component(CLIENT_ID, CLIENT_SECRET, AUTHORIZE_URL, TOKEN_URL, REFRESH_TOKEN_URL, REVOKE_TOKEN_URL)

if "auth" not in st.session_state:
    # Nếu chưa đăng nhập, hiện nút bấm
    result = oauth2.authorize_button(
        name="Đăng nhập bằng Google",
        redirect_uri=st.secrets.get("REDIRECT_URI", "https://your-app.streamlit.app"),
        scope="openid email profile",
    )
    if result and "token" in result:
        st.session_state.auth = result
        st.rerun()
else:
    # 3. Nội dung khi đã đăng nhập thành công
    st.sidebar.success("✅ Đã đăng nhập")
    if st.sidebar.button("Đăng xuất"):
        del st.session_state.auth
        st.rerun()

    # Kết nối với Gemini AI
    genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
    model = genai.GenerativeModel('gemini-pro')

    user_input = st.text_input("Nhập yêu cầu của bạn (Ví dụ: Phân tích tiềm năng đất nền):")
    if user_input:
        response = model.generate_content(user_input)
        st.markdown(response.text)
