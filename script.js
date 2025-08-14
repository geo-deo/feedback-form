document.getElementById("contactForm").addEventListener("submit", function(event) {
    event.preventDefault(); // отменяем отправку формы

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    console.log("Имя:", name);
    console.log("Email:", email);
    console.log("Сообщение:", message);

    alert("Спасибо за ваше сообщение, " + name + "!");
});
