/* Wholesale enquiry form.
   No CRM is connected yet, so a valid form opens the visitor's email app with the request filled in.
   When a CRM is chosen, replace send() with a POST to it. */
(function () {
  var form = document.getElementById('enquiryForm');
  if (!form) return;
  var error = document.getElementById('formError');
  var done = document.getElementById('formDone');
  var TO = 'managerqueen1@gmail.com';

  function fail(field, msg) {
    error.textContent = msg;
    error.hidden = false;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }

  form.addEventListener('input', function (e) {
    if (e.target.hasAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid');
    error.hidden = true;
  });

  function send(data) {
    var lines = [
      'Name: ' + data.name,
      'Salon / company: ' + data.company,
      'Country: ' + data.country,
      'E-mail: ' + data.email,
      data.phone ? 'Phone: ' + data.phone : '',
      data.brands ? 'Brands: ' + data.brands : '',
      '',
      data.message
    ].filter(function (l, i, a) { return l !== '' || (i && a[i - 1] !== ''); });
    var href = 'mailto:' + TO +
      '?subject=' + encodeURIComponent('Wholesale enquiry — ' + data.company) +
      '&body=' + encodeURIComponent(lines.join('\n'));
    window.location.href = href;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var required = [['name', 'Please enter your name.'], ['company', 'Please enter your salon or company.'], ['email', 'Please enter your e-mail.'], ['country', 'Please enter your country.']];
    for (var i = 0; i < required.length; i++) {
      if (!f[required[i][0]].value.trim()) return fail(f[required[i][0]], required[i][1]);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) return fail(f.email, 'Please check your e-mail address.');
    if (!f.consent.checked) return fail(f.consent, 'Please agree to the processing of your data.');

    var brands = [].slice.call(form.querySelectorAll('input[name="brands"]:checked')).map(function (c) { return c.value; }).join(', ');
    send({
      name: f.name.value.trim(), company: f.company.value.trim(), email: f.email.value.trim(),
      phone: f.phone.value.trim(), country: f.country.value.trim(), brands: brands, message: f.message.value.trim()
    });
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });
})();
