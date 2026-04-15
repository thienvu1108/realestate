import streamlit as st
import google.generativeai as genai

# Cấu hình giao diện
st.title("Ứng dụng AI của tôi")

# Kiểm tra đăng nhập (đây là logic mô phỏng đơn giản)
if "google_auth" not in st.session_state:
    st.write("Vui lòng đăng nhập để sử dụng")
    if st.button("Đăng nhập bằng Google"):
        st.session_state.google_auth = True
        st.rerun()
else:
    # Sau khi đăng nhập, hiện phần chatbot
    api_key = st.secrets["GOOGLE_API_KEY"]
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-pro')

    user_input = st.text_input("Nhập câu hỏi của bạn:")
    if user_input:
        response = model.generate_content(user_input)
        st.write(response.text)
