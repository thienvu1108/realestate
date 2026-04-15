import streamlit as st
from streamlit_google_oauth import login_button
import google.generativeai as genai

# Lấy thông tin từ Secrets
CLIENT_ID = st.secrets["CLIENT_ID"]
CLIENT_SECRET = st.secrets["CLIENT_SECRET"]
API_KEY = st.secrets["GOOGLE_API_KEY"]

st.title("Ứng dụng Real Estate AI")

# Cấu hình nút đăng nhập thật
login_info = login_button(client_id=CLIENT_ID, client_secret=CLIENT_SECRET)

if login_info:
    # Nếu đăng nhập thành công, login_info sẽ chứa thông tin người dùng
    st.success(f"Chào mừng {login_info['name']}!")
    
    # --- NỘI DUNG APP CỦA BẠN NẰM Ở ĐÂY ---
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel('gemini-pro')
    
    user_input = st.text_input("Hỏi tôi về bất động sản hoặc vụ án:")
    if user_input:
        response = model.generate_content(user_input)
        st.write(response.text)
else:
    # Nếu chưa đăng nhập
    st.warning("Vui lòng nhấn nút đăng nhập bên trên để tiếp tục.")
