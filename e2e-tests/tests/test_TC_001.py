from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import uuid
import time
from config import BASE_URL, TEST_USER_FIRST_NAME, TEST_USER_LAST_NAME, TEST_USER_PASSWORD

def test_registration_valid_essential_only_data(driver):

    unique_id = str(uuid.uuid4())[:8]
    unique_email = f"TestUser{unique_id}@example.com"

    driver.get(BASE_URL)
    wait = WebDriverWait(driver, 10)
    
    open_register_page_btn = wait.until(
        EC.presence_of_element_located((By.CLASS_NAME, "link-btn"))
    )

    open_register_page_btn.click()

    first_name_input = wait.until(
        EC.presence_of_element_located((By.ID, "firstName"))
    )
    last_name_input = wait.until(
        EC.presence_of_element_located((By.ID, "lastName"))
    )
    email_input = wait.until(
        EC.presence_of_element_located((By.ID, "email"))
    )
    password_input = wait.until(
        EC.presence_of_element_located((By.ID, "password"))
    )
    confirm_password_input = wait.until(
        EC.presence_of_element_located((By.ID, "confirmPassword"))
    )
    register_btn = wait.until(
        EC.presence_of_element_located((By.CLASS_NAME, "submit-btn"))
    )

    first_name_input.send_keys(TEST_USER_FIRST_NAME)
    last_name_input.send_keys(TEST_USER_LAST_NAME)
    email_input.send_keys(unique_email)
    password_input.send_keys(TEST_USER_PASSWORD)
    confirm_password_input.send_keys(TEST_USER_PASSWORD)
    register_btn.click()
    time.sleep(5)

    xpath = '//*[@id="root"]/div/main/div/div[1]/div[1]/p[1]'
    email_p = wait.until(
        EC.presence_of_element_located((By.XPATH, xpath))
    )

    assert unique_email in email_p.text, f"Email nie znaleziony. Znaleziono: {email_p.text}"
