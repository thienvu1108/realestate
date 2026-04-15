import streamlit as st
import google.generativeai as genai

# 1. Cấu hình trang
st.set_page_config(page_title="AI Assistant", layout="centered")
st.title("🤖 Ứng dụng AI của tôi")

# 2. Kiểm tra xem đã điền chìa khóa bí mật chưa
if "GOOGLE_API_KEY" not in st.secrets:
    st.error("Vui lòng bổ sung GOOGLE_API_KEY trong phần Secrets của Streamlit!")
    st.stop()

# 3. Logic Đăng nhập
# Lưu ý: Đây là phiên bản đơn giản. Để làm login Gmail "thật" 100%, 
# bạn cần dùng thư viện 'streamlit-google-oauth'.
if "google_auth" not in st.session_state:
    st.session_state.google_auth = False

if not st.session_state.google_auth:
    st.info("Chào mừng bạn! Vui lòng đăng nhập để bắt đầu sử dụng trí tuệ nhân tạo.")
    if st.button("Đăng nhập bằng tài khoản Google"):
        # Ở đây chúng ta tạm thời xác nhận đăng nhập
        st.session_state.google_auth = True
        st.rerun()
else:
    # 4. Giao diện sau khi đăng nhập thành công
    with st.sidebar:
        st.success("Đã đăng nhập thành công!")
        if st.button("Đăng xuất"):
            st.session_state.google_auth = False
            st.rerun()

    # Cấu hình Gemini AI
    api_key = st.secrets["GOOGLE_API_KEY"]
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-pro')

    # Ô nhập liệu
    user_input = st.text_input("Hãy nhập câu hỏi cho AI (Ví dụ: Kể cho tôi một vụ án bí ẩn):")
    
    if user_input:
        with st.spinner('AI đang suy nghĩ...'):
            try:
                response = model.generate_content(user_input)
                st.markdown("### Trả lời từ AI:")
                st.write(response.text)
            except Exception as e:
                st.error(f"Có lỗi xảy ra: {e}")
