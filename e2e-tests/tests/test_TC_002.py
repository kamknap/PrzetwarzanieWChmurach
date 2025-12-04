from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import uuid
import time
from config import BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

#warunek wstepny - user nie ma wypozyczonych filmow oraz pusta historia wypozyczenia

def test_login_rent_return_movie_valid(driver):

    driver.get(BASE_URL)
    wait = WebDriverWait(driver, 10)

    #logowanie do strony

    email_input = wait.until(
        EC.presence_of_element_located((By.ID, "email"))
    )
    password_input = wait.until(
        EC.presence_of_element_located((By.ID, "password"))
    )
    login_btn = wait.until(
        EC.presence_of_element_located((By.CLASS_NAME, "submit-btn"))
    )
    
    email_input.send_keys(TEST_USER_EMAIL)
    password_input.send_keys(TEST_USER_PASSWORD)
    login_btn.click()

    time.sleep(2)

    #wypozyczenie pierwszego znalezionego filmu

    movie_cards = wait.until(
        EC.presence_of_all_elements_located((By.CLASS_NAME, "movie-card"))
    )

    first_movie_card = movie_cards[0]

    movie_title = first_movie_card.find_element(By.CLASS_NAME, "movie-title").text

    rent_button = first_movie_card.find_element(By.CLASS_NAME, "rent-btn")
    rent_button.click()

    alert = wait.until(EC.alert_is_present())
    alert.accept()

    alert = wait.until(EC.alert_is_present())
    alert.accept()

    #wejscie w zakladke wypozyczen i zwrocenie

    rental_btn = wait.until(
        EC.presence_of_element_located((By.CLASS_NAME, "rental-btn"))
    )

    rental_btn.click()

    movies_rentals = wait.until(
        EC.presence_of_all_elements_located((By.CLASS_NAME, "rental-card"))
    )

    rental_titles = []
    return_btn = None
    for card in movies_rentals:
        title = card.find_element(By.TAG_NAME, "h3").text
        rental_titles.append(title)

        if title == movie_title:
            return_btn = card.find_element(By.CLASS_NAME, "return-btn")


    assert movie_title in rental_titles
    assert return_btn is not None

    return_btn.click()
    try:
        alert = wait.until(EC.alert_is_present())
        alert.accept()

        alert = wait.until(EC.alert_is_present())
        alert.accept()
    except:
        pass

    time.sleep(1)

    updated_cards = driver.find_elements(By.CLASS_NAME, "rental-card")

    for card in updated_cards:
        title = card.find_element(By.TAG_NAME, "h3").text
        if title == movie_title:
            status = card.find_element(By.CLASS_NAME, "status").text
            assert "Oczekuje na zatwierdzenie" in status
            
            paragraphs = card.find_elements(By.TAG_NAME, "p")
            assert any("Oczekuje na zatwierdzenie" in p.text for p in paragraphs)
            break
    else:
        assert False, f"Film '{movie_title}' nie znaleziony po zwrocie"

    close_rentals_btn = wait.until(
        EC.presence_of_element_located((By.CLASS_NAME, "close-btn"))
    )
    close_rentals_btn.click()

    #wylogowanie

    logout_btn = wait.until(
        EC.presence_of_element_located((By.CLASS_NAME, "logout-btn"))
    )
    logout_btn.click()

    time.sleep(2)

    #logowanie jako admin
    
    email_input = wait.until(
        EC.presence_of_element_located((By.ID, "email"))
    )
    password_input = wait.until(
        EC.presence_of_element_located((By.ID, "password"))
    )
    login_btn = wait.until(
        EC.presence_of_element_located((By.CLASS_NAME, "submit-btn"))
    )
    
    email_input.send_keys(TEST_ADMIN_EMAIL)
    password_input.send_keys(TEST_ADMIN_PASSWORD)
    login_btn.click()

    time.sleep(2)

    #zaakceptowanie zwrotu

    waiting_rentals_btn = wait.until(
        EC.presence_of_element_located((By.XPATH, '//*[@id="root"]/div/main/div/div[2]/div/div[1]/button[2]'))
    )
    waiting_rentals_btn.click()

    wait.until(EC.presence_of_element_located((By.CLASS_NAME, "modal-content")))

    waiting_rows = wait.until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, "tbody tr"))
    )

    approved = False
    for row in waiting_rows:
        cells = row.find_elements(By.TAG_NAME, "td")
        
        if len(cells) > 0:
            film_title = cells[0].text
            
            if movie_title in film_title:
                approve_btn = cells[-1].find_element(By.TAG_NAME, "button")
                approve_btn.click()
                approved = True
                break

    assert approved, f"Film '{movie_title}' nie znaleziony w panelu oczekujących zwrotów"

    try:
        alert = wait.until(EC.alert_is_present())
        alert.accept()

        alert = wait.until(EC.alert_is_present())
        alert.accept()
    except:
        pass

    try:
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "loading-container")))
        wait.until(EC.invisibility_of_element_located((By.CLASS_NAME, "loading-container")))
    except TimeoutException:
        time.sleep(0.5)

    close_waiting_rentals_btn = wait.until(
        EC.presence_of_element_located((By.CLASS_NAME, "close-btn"))
    )
    close_waiting_rentals_btn.click()


    logout_btn = wait.until(
        EC.presence_of_element_located((By.CLASS_NAME, "logout-btn"))
    )
    logout_btn.click()

    time.sleep(2)

    #zalogowanie jako user i usuniecie filmu z historii

    email_input = wait.until(
        EC.presence_of_element_located((By.ID, "email"))
    )
    password_input = wait.until(
        EC.presence_of_element_located((By.ID, "password"))
    )
    login_btn = wait.until(
        EC.presence_of_element_located((By.CLASS_NAME, "submit-btn"))
    )
    
    email_input.send_keys(TEST_USER_EMAIL)
    password_input.send_keys(TEST_USER_PASSWORD)
    login_btn.click()

    time.sleep(2)

    rental_btn = wait.until(
        EC.presence_of_element_located((By.CLASS_NAME, "rental-btn"))
    )

    rental_btn.click()

    rental_cards_final = wait.until(
    EC.presence_of_all_elements_located((By.CLASS_NAME, "rental-card"))
    )

    deleted = False
    for card in rental_cards_final:
        title = card.find_element(By.TAG_NAME, "h3").text
        
        if title == movie_title:
            status = card.find_element(By.CLASS_NAME, "status").text
            assert "Zwrócone" in status, \
                f"Film '{movie_title}' powinien być zwrócony, a ma status: {status}"
            
            delete_btn = card.find_element(By.CLASS_NAME, "delete-btn")
            delete_btn.click()
            deleted = True
            break

    assert deleted, f"Film '{movie_title}' nie znaleziony w historii do usunięcia"

    try:
        alert = wait.until(EC.alert_is_present())
        alert.accept()

        alert = wait.until(EC.alert_is_present())
        alert.accept()
    except:
        pass

    time.sleep(1)

    final_cards = driver.find_elements(By.CLASS_NAME, "rental-card")
    final_titles = [card.find_element(By.TAG_NAME, "h3").text for card in final_cards]

    assert movie_title not in final_titles